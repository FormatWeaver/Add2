
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, AppState, AppPhase, CostImpactLevel } from '../types';
import { SquaresPlusIcon, FolderClockIcon, GlobeAltIcon, SparklesIcon, ExclamationTriangleIcon, EllipsisVerticalIcon, TrashIcon, UserIcon, PencilSquareIcon, MapPinIcon, BuildingOfficeIcon, BriefcaseIcon, CloseIcon, ShieldCheckIcon, UserGroupIcon, CheckIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './Spinner';

const MotionDiv = motion.div as any;

const ProjectStat = ({ label, value }: { label: string, value: string | number }) => (
    <div className="text-center">
        <p className="font-bold text-2xl text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
);

interface UserStats {
    projectCount: number;
    addendaCount: number;
    calculatedScore: number;
    suggestedRank: string;
}

const UserRow = ({ user, stats, onEditRank }: { user: User, stats: UserStats, onEditRank: (u: User, s: UserStats) => void }) => (
    <div className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-4 min-w-[250px]">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                {user.avatarUrl ? <img src={user.avatarUrl} className="h-full w-full object-cover" /> : <UserIcon className="h-6 w-6 text-slate-300" />}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    {user.role === 'admin' && <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600" />}
                </div>
                <p className="text-[11px] text-slate-500">{user.email}</p>
            </div>
        </div>
        
        <div className="flex flex-1 justify-around px-8">
            <div className="text-center">
                <p className="text-xs font-black text-slate-700">{stats.projectCount}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Projects</p>
            </div>
            <div className="text-center">
                <p className="text-xs font-black text-slate-700">{stats.addendaCount}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Addenda</p>
            </div>
        </div>

        <div className="flex items-center gap-8 min-w-[200px] justify-end">
            <div className="text-right">
                <p className="text-sm font-black text-brand-600">{user.efficiencyScore || 0}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{user.platformRank || 'Standard'}</p>
            </div>
            <button 
                onClick={() => onEditRank(user, stats)}
                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                title="Manage Efficiency & Rank"
            >
                <PencilSquareIcon className="h-5 w-5" />
            </button>
        </div>
    </div>
);

const MilestoneItem = ({ threshold, current, label, subtitle, iconText, active }: { threshold: number, current: number, label: string, subtitle: string, iconText: string, active: boolean }) => (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-brand-50 border-brand-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
        <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${active ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-400'}`}>
            {active && current >= threshold ? <CheckIcon className="h-6 w-6" strokeWidth={3} /> : iconText}
        </div>
        <div className="min-w-0">
            <p className={`text-sm font-black truncate ${active ? 'text-brand-900' : 'text-slate-600'}`}>{label}</p>
            <p className={`text-[11px] font-bold uppercase tracking-tight ${active ? 'text-brand-600' : 'text-slate-400'}`}>{subtitle}</p>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ${active ? 'bg-brand-500' : 'bg-slate-300'}`} 
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
            className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <MotionDiv
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Manage User Rank</h2>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-500"/></button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Projects</p>
                             <p className="text-xl font-black text-slate-800">{stats.projectCount}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Addenda</p>
                             <p className="text-xl font-black text-slate-800">{stats.addendaCount}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700">Efficiency Score (Manual Overide)</label>
                            <span className="text-lg font-black text-brand-600">{score}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={score} 
                            onChange={(e) => setScore(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                        <p className="text-[10px] text-slate-400 italic">System calculated: {stats.calculatedScore}%</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Platform Title / Rank</label>
                        <select 
                            value={rank} 
                            onChange={(e) => setRank(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all"
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
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                    <button onClick={() => { onSave(score, rank); onClose(); }} className="px-8 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-md transition-all">Apply Ranking</button>
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
            className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <MotionDiv
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">Edit Professional Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-500"/></button>
                </div>
                
                <div className="p-8 max-h-[75vh] overflow-y-auto space-y-6">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="relative group">
                            <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <UserIcon className="h-12 w-12 text-slate-400" />
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-all border-2 border-white"
                                title="Change Profile Picture"
                            >
                                <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profile Identity</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><UserIcon className="h-4 w-4 text-slate-400"/>Full Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><BriefcaseIcon className="h-4 w-4 text-slate-400"/>Job Title</label>
                            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Estimator" className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><BuildingOfficeIcon className="h-4 w-4 text-slate-400"/>Company</label>
                            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Construction" className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapPinIcon className="h-4 w-4 text-slate-400"/>Location</label>
                            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Toronto, ON" className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700">Professional Bio</label>
                        <textarea 
                            value={bio} 
                            onChange={e => setBio(e.target.value)} 
                            rows={3} 
                            placeholder="Tell us about your experience..."
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none" 
                        />
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-8 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-md transition-all">Save Changes</button>
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
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full text-slate-500 hover:bg-slate-200/60 transition-colors">
                <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                    >
                        <div className="py-1">
                            {project.monitoringUrl && (
                                <button onClick={() => handleMenuAction(onCheck)} disabled={isChecking} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                                    <SparklesIcon className="h-5 w-5 text-gray-500" />
                                    <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
                                </button>
                            )}
                            <button onClick={() => handleMenuAction(onMonitor)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <GlobeAltIcon className="h-5 w-5 text-gray-500" />
                                <span>{project.monitoringUrl ? 'Edit Monitoring URL' : 'Enable Monitoring'}</span>
                            </button>
                            <button onClick={() => handleMenuAction(onDelete)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                <TrashIcon className="h-5 w-5" />
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
    onSelectProject: (projectId: string) => void;
    onOpenMonitorModal: (project: AppState) => void;
    onOpenDeleteModal: (project: AppState) => void;
    onCheckForUpdate: (projectId: string) => void;
    isAdminView?: boolean;
    key?: React.Key;
}

const ProjectCard = ({ project, onSelectProject, onOpenMonitorModal, onOpenDeleteModal, onCheckForUpdate, isAdminView }: ProjectCardProps) => {

    const formatTimestamp = (ts: number | null | undefined) => {
        if (!ts) return 'N/A';
        return new Date(ts).toLocaleString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };
    
    const totalChanges = project.changeLog.length;
    const highImpactChanges = project.costAnalysisResult?.cost_impact_items.filter(item => item.cost_impact === CostImpactLevel.HIGH).length || 0;

    return (
        <MotionDiv
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`bg-white rounded-xl shadow-md border border-slate-200 flex flex-col transition-all duration-300 ${project.monitoringStatus === 'found' ? 'ring-4 ring-amber-400' : ''}`}
        >
            <div className="p-6">
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                             <h3 className="font-bold text-lg text-slate-900 truncate" title={project.projectName!}>
                                {project.projectName}
                            </h3>
                            {isAdminView && <span className="text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight">System Global</span>}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {isAdminView ? `User: ${project.currentUser?.email || 'Unknown'}` : `Last modified: ${formatTimestamp(project.lastModified)}`}
                        </p>
                    </div>
                     <ProjectActionsMenu 
                        project={project}
                        onMonitor={() => onOpenMonitorModal(project)}
                        onDelete={() => onOpenDeleteModal(project)}
                        onCheck={() => onCheckForUpdate(project.projectId)}
                     />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 border-t border-b border-slate-200/80 py-4">
                    <ProjectStat label="Addenda" value={project.addenda.length} />
                    <ProjectStat label="Total Changes" value={totalChanges} />
                    <ProjectStat label="High Impact" value={highImpactChanges} />
                </div>
                
                <AnimatePresence>
                    {project.monitoringStatus === 'found' && (
                        <MotionDiv key="found" initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="flex items-center gap-3 p-3 bg-amber-100 rounded-lg border border-amber-300">
                            <ExclamationTriangleIcon className="h-6 w-6 text-amber-700 animate-pulse" />
                            <div className="text-sm">
                                <p className="font-bold text-amber-800">New Addendum Found!</p>
                                <p className="text-amber-700">Click below to upload and analyze it.</p>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => onSelectProject(project.projectId)}
                    className="mt-6 w-full px-6 py-2.5 text-sm font-bold bg-brand-600 text-white rounded-lg shadow-md hover:bg-brand-700 transition-colors"
                >
                    {isAdminView ? 'Inspect Project' : (project.monitoringStatus === 'found' ? 'Review New Addendum' : 'Continue Project')}
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

    useEffect(() => {
        if (projectToMonitor) {
            setUrlInput(projectToMonitor.monitoringUrl || '');
        }
    }, [projectToMonitor]);

    const sortedProjects = Array.from(projects.values()).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    const sortedGlobalProjects = Array.from(globalProjects.values()).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

    // Calculate system stats for admin view
    const userStatsMap = useMemo(() => {
        const stats = new Map<string, UserStats>();
        
        // Ensure all users exist in stats map
        allUsers.forEach(u => stats.set(u.id, { projectCount: 0, addendaCount: 0, calculatedScore: 0, suggestedRank: '' }));

        // Aggregate from global projects
        sortedGlobalProjects.forEach(proj => {
            const uid = proj.currentUser?.id;
            if (uid && stats.has(uid)) {
                const s = stats.get(uid)!;
                s.projectCount++;
                s.addendaCount += proj.addenda.length;
            }
        });

        // Compute efficiency scores
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
    }, [allUsers, sortedGlobalProjects]);

    // Calculate personal milestones
    const personalMilestones = useMemo(() => {
        let totalPages = 0;
        let conformedCount = 0;
        sortedProjects.forEach(p => {
            totalPages += (p.baseDrawingsPageCount || 0) + (p.baseSpecsPageCount || 0);
            if (p.phase === AppPhase.RESULTS) conformedCount++;
        });
        return { totalPages, conformedCount };
    }, [sortedProjects]);

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

    return (
        <div className="w-full h-full flex flex-col items-center p-4 sm:p-8 bg-slate-50 overflow-y-auto">
            <div className="w-full max-w-6xl">
                {/* Profile Section Header */}
                <MotionDiv 
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center gap-8"
                >
                    <div className="relative">
                        <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center">
                            {currentUser.avatarUrl ? (
                                <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-16 w-16 text-slate-300" />
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 h-6 w-6 rounded-full border-4 border-white shadow-sm" title="Online"></div>
                    </div>
                    
                    <div className="flex-grow text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {currentUser.name}
                            </h1>
                            {isAdmin && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-200">
                                    <ShieldCheckIcon className="h-3.5 w-3.5" /> Master Owner
                                </span>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-4 text-slate-600">
                            {currentUser.jobTitle && <span className="flex items-center gap-1.5 text-sm font-semibold"><BriefcaseIcon className="h-4 w-4 text-slate-400"/>{currentUser.jobTitle}</span>}
                            {currentUser.company && <span className="flex items-center gap-1.5 text-sm font-semibold"><BuildingOfficeIcon className="h-4 w-4 text-slate-400"/>{currentUser.company}</span>}
                            {currentUser.location && <span className="flex items-center gap-1.5 text-sm font-semibold"><MapPinIcon className="h-4 w-4 text-slate-400"/>{currentUser.location}</span>}
                        </div>
                        {currentUser.bio && (
                            <p className="mt-4 text-sm text-slate-500 max-w-2xl leading-relaxed italic">
                                "{currentUser.bio}"
                            </p>
                        )}
                        <button 
                            onClick={() => setIsProfileModalOpen(true)}
                            className="mt-6 flex items-center gap-2 px-5 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all border border-slate-200"
                        >
                            <PencilSquareIcon className="h-4 w-4" /> Edit Profile Details
                        </button>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 min-w-[200px]">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Efficiency Score</p>
                        <div className="text-4xl font-black text-brand-600">{currentUser.efficiencyScore || 85}%</div>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{currentUser.platformRank || 'Professional Estimator'}</p>
                    </div>
                </MotionDiv>

                {isAdmin && (
                    <div className="flex gap-2 mb-6 p-1 bg-white border border-slate-200 rounded-xl w-fit">
                        <button 
                            onClick={() => setDashboardTab('my-projects')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${dashboardTab === 'my-projects' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            My Workspace
                        </button>
                        <button 
                            onClick={() => setDashboardTab('admin-portal')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${dashboardTab === 'admin-portal' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <ShieldCheckIcon className="h-4 w-4" /> Global Admin Portal
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        {dashboardTab === 'my-projects' ? (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <FolderClockIcon className="h-6 w-6 text-slate-500"/>
                                    <h2 className="text-xl font-bold text-slate-800">Your Active Projects</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {sortedProjects.length > 0 ? (
                                        sortedProjects.map(project => (
                                            <ProjectCard
                                                key={project.projectId}
                                                project={project}
                                                onSelectProject={onSelectProject}
                                                onOpenMonitorModal={setProjectToMonitor}
                                                onOpenDeleteModal={setProjectToDelete}
                                                onCheckForUpdate={onCheckForUpdate}
                                            />
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
                                            <p className="text-slate-500">You don't have any active projects.</p>
                                            <p className="text-sm text-slate-400 mt-1">Start a new project to see it here.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <UserGroupIcon className="h-6 w-6 text-brand-600"/>
                                    <h2 className="text-xl font-bold text-slate-800">Manage Efficiency & Users</h2>
                                </div>
                                
                                <div className="space-y-4 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Platform User Directory</p>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{allUsers.length} Users Found</p>
                                    </div>
                                    <div className="max-h-[600px] overflow-y-auto">
                                        {allUsers.length > 0 ? (
                                            allUsers.map(user => (
                                                <UserRow 
                                                    key={user.id} 
                                                    user={user} 
                                                    stats={userStatsMap.get(user.id) || { projectCount: 0, addendaCount: 0, calculatedScore: 0, suggestedRank: '' }}
                                                    onEditRank={(u, s) => setUserToRank({user: u, stats: s})} 
                                                />
                                            ))
                                        ) : (
                                            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                                                <Spinner colorClass="text-slate-400" />
                                                Loading global platform directory...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <GlobeAltIcon className="h-6 w-6 text-brand-600"/>
                                        <h2 className="text-xl font-bold text-slate-800">Global Project Inspection</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sortedGlobalProjects.length > 0 ? (
                                            sortedGlobalProjects.map(project => (
                                                <ProjectCard
                                                    key={project.projectId}
                                                    project={project}
                                                    onSelectProject={onSelectProject}
                                                    onOpenMonitorModal={setProjectToMonitor}
                                                    onOpenDeleteModal={setProjectToDelete}
                                                    onCheckForUpdate={onCheckForUpdate}
                                                    isAdminView={true}
                                                />
                                            ))
                                        ) : (
                                            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200">
                                                <p className="text-slate-500">No global projects found in database.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-8">
                         <div className="flex flex-col gap-4">
                            <button 
                                onClick={onStartNewProject}
                                className="w-full flex items-center justify-center gap-3 p-5 bg-brand-600 text-white rounded-2xl shadow-lg hover:bg-brand-700 transition-all group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                            >
                                <SquaresPlusIcon className="h-6 w-6" />
                                <span className="font-bold">Start New Project</span>
                            </button>
                        </div>

                        {dashboardTab === 'admin-portal' ? (
                             <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
                                <h3 className="font-bold text-brand-400 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                    <GlobeAltIcon className="h-5 w-5"/>
                                    System Status
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                        <span className="text-slate-400 text-xs font-bold uppercase">Total Users</span>
                                        <span className="text-2xl font-black">{allUsers.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                        <span className="text-slate-400 text-xs font-bold uppercase">Global Projects</span>
                                        <span className="text-2xl font-black">{globalProjects.size}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                        <span className="text-slate-400 text-xs font-bold uppercase">API Health</span>
                                        <span className="text-emerald-400 text-xs font-black uppercase flex items-center gap-1">
                                            <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                            Optimal
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-xs font-bold uppercase">DB Load</span>
                                        <span className="text-2xl font-black text-brand-400">Low</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                    <SparklesIcon className="h-5 w-5 text-amber-500"/>
                                    Professional Milestones
                                </h3>
                                <div className="space-y-4">
                                    <MilestoneItem 
                                        threshold={1000} 
                                        current={personalMilestones.totalPages} 
                                        label="Document Integration Master" 
                                        subtitle={`Processed ${personalMilestones.totalPages.toLocaleString()} / 1,000 pages`} 
                                        iconText="1k"
                                        active={true}
                                    />
                                    <MilestoneItem 
                                        threshold={50} 
                                        current={personalMilestones.conformedCount} 
                                        label="Project Completionist" 
                                        subtitle={`${personalMilestones.conformedCount} / 50 projects conformed`} 
                                        iconText="50"
                                        active={personalMilestones.conformedCount > 0}
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
                        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
                        onClick={() => setProjectToDelete(null)}
                    >
                        <MotionDiv
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
                        >
                            <div className="p-6 text-center">
                                <TrashIcon className="h-12 w-12 mx-auto text-red-500" />
                                <h3 className="mt-4 text-lg font-bold text-slate-900">Delete Project?</h3>
                                <p className="mt-2 text-sm text-slate-600">
                                    Are you sure you want to permanently delete "{projectToDelete.projectName}"? This action will remove the project and all associated documents. It cannot be undone.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3 p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                                <button onClick={() => setProjectToDelete(null)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition">Cancel</button>
                                <button onClick={handleConfirmDelete} disabled={isDeleting} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition flex items-center gap-2 disabled:bg-red-400">
                                    {isDeleting && <Spinner />}
                                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                            </div>
                        </MotionDiv>
                    </MotionDiv>
                )}

                {projectToMonitor && (
                     <MotionDiv
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
                        onClick={() => setProjectToMonitor(null)}
                    >
                        <MotionDiv
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
                        >
                             <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-brand-100">
                                        <GlobeAltIcon className="h-6 w-6 text-brand-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-0 text-left">
                                        <h3 className="text-lg leading-6 font-bold text-gray-900">Addenda Monitoring</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">Enter the public URL for the project's bidding site. We will monitor this page for new addenda and notify you.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <input
                                        type="url"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://bidsandtenders.com/..."
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                             </div>
                            <div className="flex justify-end gap-3 p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                                <button onClick={() => setProjectToMonitor(null)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition">Cancel</button>
                                <button onClick={handleSaveUrl} className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md shadow-sm transition">
                                    Save
                                </button>
                            </div>
                        </MotionDiv>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};
