import React, { useState, useEffect, useRef } from 'react';
import { User, AppState, AppPhase, CostImpactLevel } from '../types';
import { SquaresPlusIcon, FolderClockIcon, GlobeAltIcon, SparklesIcon, ExclamationTriangleIcon, EllipsisVerticalIcon, TrashIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './Spinner';

const MotionDiv = motion.div as any;

const ProjectStat = ({ label, value }: { label: string, value: string | number }) => (
    <div className="text-center">
        <p className="font-bold text-2xl text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
);

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
}

const ProjectCard = ({ project, onSelectProject, onOpenMonitorModal, onOpenDeleteModal, onCheckForUpdate }: ProjectCardProps) => {

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
                        <h3 className="font-bold text-lg text-slate-900 truncate" title={project.projectName!}>
                            {project.projectName}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Last modified: {formatTimestamp(project.lastModified)}
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
                    {project.monitoringStatus === 'found' ? 'Review New Addendum' : 'Continue Project'}
                </button>
            </div>
        </MotionDiv>
    );
};

interface UserDashboardProps {
    currentUser: User;
    projects: Map<string, AppState>;
    onStartNewProject: () => void;
    onSelectProject: (projectId: string) => void;
    onSetMonitoringUrl: (projectId: string, url: string) => void;
    onCheckForUpdate: (projectId: string) => void;
    onDeleteProject: (projectId: string) => Promise<void>;
}

export const UserDashboard = ({ currentUser, projects, onStartNewProject, onSelectProject, onSetMonitoringUrl, onCheckForUpdate, onDeleteProject }: UserDashboardProps) => {
    const [projectToDelete, setProjectToDelete] = useState<AppState | null>(null);
    const [projectToMonitor, setProjectToMonitor] = useState<AppState | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (projectToMonitor) {
            setUrlInput(projectToMonitor.monitoringUrl || '');
        }
    }, [projectToMonitor]);

    const sortedProjects = Array.from(projects.values()).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));

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

    return (
        <div className="w-full h-full flex flex-col items-center p-4 sm:p-8 bg-slate-50 overflow-y-auto">
            <div className="w-full max-w-5xl">
                <MotionDiv initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Welcome back, {currentUser.name.split(' ')[0]}
                    </h1>
                    <p className="mt-2 text-lg text-slate-600">Let's get your next bid conformed.</p>
                </MotionDiv>

                <MotionDiv 
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-10"
                >
                    <button 
                        onClick={onStartNewProject}
                        className="w-full flex flex-col items-center justify-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                    >
                        <SquaresPlusIcon className="h-12 w-12 text-slate-400 group-hover:text-brand-600 transition-colors" />
                        <span className="mt-4 text-xl font-bold text-slate-700 group-hover:text-brand-700 transition-colors">Start New Project</span>
                        <span className="mt-1 text-sm text-slate-500">Create a new blueprint from original tender documents.</span>
                    </button>
                </MotionDiv>
                
                <MotionDiv 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-12"
                >
                    <div className="flex items-center gap-3">
                        <FolderClockIcon className="h-6 w-6 text-slate-500"/>
                        <h2 className="text-xl font-bold text-slate-800">Recent Projects</h2>
                    </div>
                    <div className="mt-4">
                        <AnimatePresence>
                        {sortedProjects.length > 0 ? (
                            <div className="space-y-4">
                                {sortedProjects.map(project => (
                                    <ProjectCard
                                        key={project.projectId}
                                        project={project}
                                        onSelectProject={onSelectProject}
                                        onOpenMonitorModal={setProjectToMonitor}
                                        onOpenDeleteModal={setProjectToDelete}
                                        onCheckForUpdate={onCheckForUpdate}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                                <p className="text-slate-500">You don't have any active projects.</p>
                                <p className="text-sm text-slate-400 mt-1">Start a new project to see it here.</p>
                            </div>
                        )}
                        </AnimatePresence>
                    </div>
                </MotionDiv>
            </div>
            
            <AnimatePresence>
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