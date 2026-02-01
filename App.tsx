
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppPhase, AppChangeLogItem, ChangeStatus, Page, ConformingPlan, ChangeType, AIConformingPlan, PageMapItem, TriageReportData, ProjectFile, QAndAItem, AppError, ConformedPageInfo, User, MonitoringStatus, RiskLevel } from './types';
import DocumentUploader from './components/DocumentUploader';
import ProcessingView from './components/ProcessingView';
import ResultsView from './components/ResultsView';
import LandingPage from './components/LandingPage';
import { HowItWorksPage } from './components/HowItWorksPage';
import { LoginPage } from './components/LoginPage';
import { PricingPage } from './components/PricingPage';
import { generateConformingPlan, generateTriageReport, generateExecutiveSummary, generateCostImpactAnalysis, verifyDocumentConsistency, checkUrlForNewAddenda } from './services/geminiService';
import { Logo } from './components/Logo';
import { mapChangesToPages } from './services/pageMapperService';
import * as pdfjsLib from 'pdfjs-dist';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorDisplay } from './components/ErrorDisplay';
import { UserIcon, BellIcon, ClockIcon, GearIcon, ArrowPathIcon, CheckCircleIcon, ShieldCheckIcon } from './components/icons';
import { UserDashboard } from './components/UserDashboard';
import { supabase } from './services/supabaseClient';
import { fetchProjects, saveProject, uploadFile, downloadFile, deleteProject, fetchAllProjectsGlobal, fetchAllUsersGlobal, updateUserRank } from './services/projectService';
import { motion, AnimatePresence } from 'framer-motion';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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

const createInitialAppState = (projectId: string, projectName: string | null = null): AppState => ({
    projectId,
    phase: AppPhase.PROJECT_SETUP,
    appError: null,
    currentUser: null,
    baseDrawings: null,
    baseSpecs: null,
    addenda: [],
    projectName,
    lastModified: Date.now(),
    changeLog: [],
    qaLog: [],
    drawingsConformingPlan: null,
    specsConformingPlan: null,
    baseDrawingsPageCount: 0,
    baseSpecsPageCount: 0,
    triageReport: null,
    activeDocumentTitle: '',
    executiveSummary: null,
    summaryError: null,
    costAnalysisResult: null,
    costAnalysisError: null,
    monitoringStatus: 'idle',
    versions: [],
    customDirectives: ''
});

interface LoadedPdfDocs {
    baseDrawings: pdfjsLib.PDFDocumentProxy | null;
    baseSpecs: pdfjsLib.PDFDocumentProxy | null;
    addenda: Map<string, pdfjsLib.PDFDocumentProxy>;
}

interface LoadedFiles {
    baseDrawings: File | null;
    baseSpecs: File | null;
    addenda: File[];
}

interface Notification {
    id: string;
    title: string;
    description: string;
    timestamp: number;
    type: 'success' | 'info' | 'warning';
}

export default function App() {
  const [projects, setProjects] = useState<Map<string, AppState>>(new Map());
  const [globalProjects, setGlobalProjects] = useState<Map<string, AppState>>(new Map());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const activeProjectIdRef = useRef<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [currentPage, setCurrentPage] = useState<Page>(Page.LANDING);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [isAnalyzingIncrementally, setIsAnalyzingIncrementally] = useState(false);
  
  const [loadedDocs, setLoadedDocs] = useState<LoadedPdfDocs>({ baseDrawings: null, baseSpecs: null, addenda: new Map() });
  const [stagedFiles, setStagedFiles] = useState<LoadedFiles>({ baseDrawings: null, baseSpecs: null, addenda: [] });

  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const [isFetchingProjectFiles, setIsFetchingProjectFiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown States
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
      { id: '1', title: 'Project Indexed', description: 'Metrotown Tower B blueprint created successfully.', timestamp: Date.now() - 3600000, type: 'success' },
      { id: '2', title: 'Addendum #3 Available', description: 'Monitoring detected a new file on the bid portal.', timestamp: Date.now() - 14400000, type: 'warning' },
      { id: '3', title: 'Version Updated', description: 'System updated to V2.5.4 with enhanced OCR.', timestamp: Date.now() - 86400000, type: 'info' }
  ]);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const appState = activeProjectId ? projects.get(activeProjectId) || globalProjects.get(activeProjectId) : null;

  useEffect(() => { activeProjectIdRef.current = activeProjectId; }, [activeProjectId]);

  // Click outside logic for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setIsNotificationOpen(false);
        }
        if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
            setIsProfileDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mapSupabaseUserToAppUser = (sbUser: any): User => ({
      id: sbUser.id,
      email: sbUser.email!,
      name: sbUser.user_metadata.name || sbUser.email!.split('@')[0],
      avatarUrl: sbUser.user_metadata.avatarUrl,
      jobTitle: sbUser.user_metadata.jobTitle,
      company: sbUser.user_metadata.company,
      location: sbUser.user_metadata.location,
      bio: sbUser.user_metadata.bio,
      role: sbUser.email === MASTER_ACCOUNT_EMAIL ? 'admin' : 'user',
      efficiencyScore: sbUser.user_metadata.efficiencyScore || 85,
      platformRank: sbUser.user_metadata.platformRank || 'Professional Estimator'
  });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) setCurrentUser(mapSupabaseUserToAppUser(session.user));
    }).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) setCurrentUser(mapSupabaseUserToAppUser(session.user));
        else setCurrentUser(prev => prev?.id.startsWith('guest-') ? prev : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && !currentUser.id.startsWith('guest-')) {
        setIsFetchingProjects(true);
        const fetchActions: Promise<any>[] = [fetchProjects(currentUser.id)];
        
        if (currentUser.role === 'admin') {
            fetchActions.push(fetchAllProjectsGlobal());
            fetchActions.push(fetchAllUsersGlobal());
        }

        Promise.all(fetchActions).then(([userProjects, globalProjs, globalUsers]) => {
            setProjects(userProjects);
            if (globalProjs) setGlobalProjects(globalProjs);
            if (globalUsers) setAllUsers(globalUsers);
        }).finally(() => setIsFetchingProjects(false));
    } else { setIsFetchingProjects(false); }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!appState || !currentUser || currentUser.id.startsWith('guest-') || isFetchingProjectFiles) return;
    const timer = setTimeout(async () => {
        setIsSaving(true);
        try { await saveProject(appState); } catch (err) { console.warn("Auto-save blip:", err); } finally { setIsSaving(false); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [appState?.changeLog, appState?.phase, appState?.projectName, appState?.triageReport, appState?.executiveSummary, appState?.monitoringUrl, appState?.monitoringStatus, appState?.versions, appState?.customDirectives]);

  useEffect(() => {
    if (currentUser) { if (currentPage === Page.LOGIN || currentPage === Page.LANDING) setCurrentPage(Page.DASHBOARD); } 
    else { if (currentPage === Page.APP || currentPage === Page.DASHBOARD) setCurrentPage(Page.LOGIN); }
  }, [!!currentUser, currentPage]);

  const updateActiveProjectState = (updater: (prevState: AppState) => AppState, targetId?: string) => {
    const idToUpdate = targetId || activeProjectIdRef.current;
    if (!idToUpdate) return;
    
    const updateInMap = (map: Map<string, AppState>) => {
        const next = new Map(map);
        const current = next.get(idToUpdate);
        if (current) {
            next.set(idToUpdate, updater({ ...current, currentUser, lastModified: Date.now() }));
            return next;
        }
        return map;
    };

    setProjects(prev => updateInMap(prev));
    setGlobalProjects(prev => updateInMap(prev));
  };

  const handleSetGuestUser = (name: string) => { 
    setCurrentUser({ 
        id: `guest-${crypto.randomUUID()}`, 
        name: name || 'Guest User', 
        email: 'guest@example.com',
        jobTitle: 'Construction Professional',
        company: 'Independent Contractor',
        role: 'user',
        efficiencyScore: 80,
        platformRank: 'Guest Trial'
    }); 
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);

    if (!currentUser.id.startsWith('guest-')) {
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    name: updatedUser.name,
                    avatarUrl: updatedUser.avatarUrl,
                    jobTitle: updatedUser.jobTitle,
                    company: updatedUser.company,
                    location: updatedUser.location,
                    bio: updatedUser.bio,
                    efficiencyScore: updatedUser.efficiencyScore,
                    platformRank: updatedUser.platformRank
                }
            });
            if (error) throw error;
        } catch (err: any) {
            alert("Failed to sync profile: " + err.message);
        }
    }
  };

  const handleUpdateProjectName = (name: string) => {
    updateActiveProjectState(prev => ({ ...prev, projectName: name }));
  };

  const handleUpdateUserRank = async (userId: string, score: number, rank: string) => {
    if (currentUser?.role !== 'admin') return;
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, efficiencyScore: score, platformRank: rank } : u));
    await updateUserRank(userId, score, rank);
  };

  const handleSetMonitoringUrl = (projectId: string, url: string) => {
    updateActiveProjectState(prev => ({ ...prev, monitoringUrl: url }), projectId);
  };

  const handleCheckForUpdate = async (projectId: string) => {
    const project = projects.get(projectId) || globalProjects.get(projectId);
    if (!project || !project.monitoringUrl) return;

    updateActiveProjectState(prev => ({ ...prev, monitoringStatus: 'checking' }), projectId);
    
    try {
        const existingNames = project.addenda.map(a => a.name);
        const { found, details } = await checkUrlForNewAddenda(project.monitoringUrl, existingNames);
        
        updateActiveProjectState(prev => ({ 
            ...prev, 
            monitoringStatus: found ? 'found' : 'idle',
            lastChecked: Date.now()
        }), projectId);
        
        if (found) {
            console.log("New addenda info:", details);
        }
    } catch (err) {
        updateActiveProjectState(prev => ({ ...prev, monitoringStatus: 'error' }), projectId);
    }
  };

  const handleCreateIndexing = async (baseDrawingsFile: File | null, baseSpecsFile: File | null, projectName: string, directives?: string) => {
    if (!currentUser || !projectName.trim()) return;
    const newProjectId = crypto.randomUUID();
    const newProjectState = createInitialAppState(newProjectId, projectName);
    newProjectState.phase = AppPhase.INDEXING_IN_PROGRESS;
    newProjectState.currentUser = currentUser;
    newProjectState.customDirectives = directives;
    setProjects(prev => { const next = new Map(prev); next.set(newProjectId, newProjectState); return next; });
    setActiveProjectId(newProjectId);
    setCurrentPage(Page.APP);
    try {
        let drawingsProjectFile: ProjectFile | null = null;
        let specsProjectFile: ProjectFile | null = null;
        if (currentUser.id.startsWith('guest-')) {
            drawingsProjectFile = baseDrawingsFile ? { name: baseDrawingsFile.name, size: baseDrawingsFile.size, type: baseDrawingsFile.type, path: 'local/drawings' } : null;
            specsProjectFile = baseSpecsFile ? { name: baseSpecsFile.name, size: baseSpecsFile.size, type: baseSpecsFile.type, path: 'local/specs' } : null;
            await delay(1000);
        } else {
            [drawingsProjectFile, specsProjectFile] = await Promise.all([
                baseDrawingsFile ? uploadFile(currentUser.id, newProjectId, baseDrawingsFile) : Promise.resolve(null),
                baseSpecsFile ? uploadFile(currentUser.id, newProjectId, baseSpecsFile) : Promise.resolve(null)
            ]);
        }
        setStagedFiles({ baseDrawings: baseDrawingsFile, baseSpecs: baseSpecsFile, addenda: [] });
        const [drawingsDoc, specsDoc] = await Promise.all([
            baseDrawingsFile ? pdfjsLib.getDocument(await baseDrawingsFile.arrayBuffer()).promise : Promise.resolve(null),
            baseSpecsFile ? pdfjsLib.getDocument(await baseSpecsFile.arrayBuffer()).promise : Promise.resolve(null),
        ]);
        setLoadedDocs({ baseDrawings: drawingsDoc, baseSpecs: specsDoc, addenda: new Map() });
        updateActiveProjectState(prev => ({ ...prev, baseDrawings: drawingsProjectFile, baseSpecs: specsProjectFile, baseDrawingsPageCount: drawingsDoc?.numPages || 0, baseSpecsPageCount: specsDoc?.numPages || 0, phase: AppPhase.ADDENDA_UPLOAD }), newProjectId);
    } catch (err: any) {
        updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.INDEXING_FAILED, appError: { title: 'Setup Failed', message: err.message } }), newProjectId);
    }
  };
  
  const handleAnalysis = async (addendaFiles: File[], skipConsistency = false) => {
    if (!appState || !currentUser) return;
    const targetId = appState.projectId;
    
    // Support "Skip Addenda" logic
    if (addendaFiles.length === 0) {
        updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.RESULTS }), targetId);
        return;
    }

    const isInitial = appState.addenda.length === 0;
    if (isInitial) updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.VERIFYING_CONSISTENCY }), targetId);
    else setIsAnalyzingIncrementally(true);
    try {
        const { baseDrawings: bDraw, baseSpecs: bSpec } = stagedFiles;
        if (!skipConsistency) {
            const res = await verifyDocumentConsistency([...addendaFiles, bDraw, bSpec], "Belong to same project?");
            if (!res.is_consistent) throw new Error(`Addendum Mismatch: ${res.reasoning}`);
        }
        if (isInitial) updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.ANALYZING_ADDENDUM }), targetId);
        let uploadedAddenda: ProjectFile[] = [];
        if (currentUser.id.startsWith('guest-')) {
            uploadedAddenda = addendaFiles.map(f => ({ name: f.name, size: f.size, type: f.type, path: `local/${f.name}` }));
            await delay(500);
        } else uploadedAddenda = await Promise.all(addendaFiles.map(f => uploadFile(currentUser.id, targetId, f)));
        const loadedArray = await Promise.all(addendaFiles.map(async f => ({ name: f.name, doc: await pdfjsLib.getDocument(await f.arrayBuffer()).promise })));
        setLoadedDocs(prev => ({ ...prev, addenda: new Map([...prev.addenda, ...loadedArray.map(i => [i.name, i.doc] as [string, pdfjsLib.PDFDocumentProxy])]) }));
        setStagedFiles(prev => ({ ...prev, addenda: [...prev.addenda, ...addendaFiles] }));
        const { plan: aiPlan } = await generateConformingPlan(addendaFiles, bDraw, bSpec, appState.customDirectives);
        const currentMaxId = appState.changeLog.reduce((max, item) => Math.max(item.id, max), -1);
        let idCounter = currentMaxId + 1;
        const newQa = (aiPlan.questions_and_answers || []).map(qa => ({ ...qa, id: idCounter++ }));
        const normalizeF = (p: string) => p.substring(p.lastIndexOf('/') + 1);
        const newChanges: AppChangeLogItem[] = aiPlan.change_instructions.map(instr => ({
            id: idCounter++, status: ChangeStatus.APPROVED, addendum_name: normalizeF(instr.source_addendum_file),
            change_type: instr.change_type, source_original_document: instr.search_target.document_type,
            description: instr.human_readable_description, location_hint: instr.search_target.location_hint,
            spec_section: instr.spec_section, discipline: instr.discipline,
            semantic_search_query: instr.search_target.semantic_search_query,
            exact_text_to_find: instr.data_payload.text_to_find, new_text_to_insert: instr.data_payload.replacement_text,
            target_page_number: instr.data_payload.original_page_number_to_affect,
            insert_after_original_page_number: instr.data_payload.insert_after_original_page_number,
            source_page: instr.data_payload.addendum_source_page_number || instr.data_payload.source_page_in_addendum || 0,
            risk_level: (instr.risk_score as RiskLevel) || RiskLevel.LOW,
            risk_rationale: instr.risk_rationale,
            suggested_rfi: instr.suggested_rfi_draft,
            audit_trail: [{ timestamp: Date.now(), userId: currentUser.id, userName: currentUser.name, action: 'APPROVED' }]
        }));
        if (isInitial) updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.MAPPING_CHANGES }), targetId);
        const mapped = await mapChangesToPages(newChanges, bDraw, bSpec);
        updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.RESULTS, addenda: [...prev.addenda, ...uploadedAddenda], changeLog: [...prev.changeLog, ...mapped], qaLog: [...prev.qaLog, ...newQa], monitoringStatus: 'idle' }), targetId);
    } catch (err: any) { updateActiveProjectState(prev => ({ ...prev, phase: isInitial ? AppPhase.ANALYSIS_FAILED : prev.phase, appError: { title: 'Analysis Failed', message: err.message } }), targetId); } 
    finally { setIsAnalyzingIncrementally(false); }
  };

  const handleGenerateTriageReport = async () => {
    if (!appState || appState.addenda.length === 0) return;
    setIsTriageLoading(true); setTriageError(null);
    try { const { report } = await generateTriageReport(stagedFiles.addenda); updateActiveProjectState(prev => ({ ...prev, triageReport: report })); } catch (err: any) { setTriageError(err.message); } 
    finally { setIsTriageLoading(false); }
  };

  const handleGenerateExecutiveSummary = async () => {
    if (!appState || appState.changeLog.length === 0) return;
    setIsSummaryLoading(true);
    try { const summary = await generateExecutiveSummary(appState.changeLog); updateActiveProjectState(prev => ({ ...prev, executiveSummary: summary, summaryError: null })); } 
    catch (err: any) { updateActiveProjectState(prev => ({ ...prev, summaryError: err.message })); } 
    finally { setIsSummaryLoading(false); }
  };

  const handleGenerateCostImpact = async () => {
    if (!appState || appState.changeLog.length === 0) return;
    try {
        const approved = appState.changeLog.filter(c => c.status === ChangeStatus.APPROVED);
        if (approved.length === 0) throw new Error("No approved changes.");
        const res = await generateCostImpactAnalysis(approved);
        updateActiveProjectState(prev => ({ ...prev, costAnalysisResult: res, costAnalysisError: null }));
    } catch (err: any) { updateActiveProjectState(prev => ({ ...prev, costAnalysisError: err.message })); }
  };

  const handleReset = () => { if (activeProjectId) { const project = projects.get(activeProjectId) || globalProjects.get(activeProjectId); updateActiveProjectState(() => createInitialAppState(activeProjectId, project?.projectName)); } setCurrentPage(Page.DASHBOARD); };
  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setProjects(new Map()); setGlobalProjects(new Map()); setCurrentPage(Page.LANDING); setActiveProjectId(null); setIsProfileDropdownOpen(false); };

  const setChangeLog = (newLog: AppChangeLogItem[] | ((prev: AppChangeLogItem[]) => AppChangeLogItem[])) => {
      updateActiveProjectState(prev => ({
        ...prev, changeLog: typeof newLog === 'function' ? newLog(prev.changeLog) : newLog,
      }));
  };
  
  const navigateTo = (page: Page) => { setCurrentPage(page); window.scrollTo(0, 0); };
  const handleStartNewProject = () => { setActiveProjectId(null); setStagedFiles({ baseDrawings: null, baseSpecs: null, addenda: [] }); navigateTo(Page.APP); };
  
  const handleSelectProject = async (projectId: string) => {
    const project = projects.get(projectId) || globalProjects.get(projectId);
    if (!project) return;
    setActiveProjectId(projectId);
    setIsFetchingProjectFiles(true);
    try {
        const filePromises = [ project.baseDrawings ? downloadFile(project.baseDrawings.path) : Promise.resolve(null), project.baseSpecs ? downloadFile(project.baseSpecs.path) : Promise.resolve(null), ...project.addenda.map(a => downloadFile(a.path)) ];
        const [bDraw, bSpec, ...addendaF] = await Promise.all(filePromises);
        const docPromises = [ bDraw ? pdfjsLib.getDocument(await bDraw.arrayBuffer()).promise : Promise.resolve(null), bSpec ? pdfjsLib.getDocument(await bSpec.arrayBuffer()).promise : Promise.resolve(null), ...addendaF.map(async f => f ? ({ name: f.name, doc: await pdfjsLib.getDocument(await f.arrayBuffer()).promise }) : null) ];
        const [dDoc, sDoc, ...aDocs] = await Promise.all(docPromises);
        setStagedFiles({ baseDrawings: bDraw, baseSpecs: bSpec, addenda: addendaF.filter((f): f is File => f !== null) });
        setLoadedDocs({ baseDrawings: dDoc, baseSpecs: sDoc, addenda: new Map(aDocs.filter(Boolean).map(i => [i!.name, i!.doc] as [string, pdfjsLib.PDFDocumentProxy])) });
        navigateTo(Page.APP);
    } catch (err: any) { alert(err.message || "Failed to load files."); setActiveProjectId(null); } 
    finally { setIsFetchingProjectFiles(false); }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!currentUser) return;
    try {
        if (!currentUser.id.startsWith('guest-')) await deleteProject(currentUser.id, projectId);
        setProjects(prev => { const next = new Map(prev); next.delete(projectId); return next; });
        setGlobalProjects(prev => { const next = new Map(prev); next.delete(projectId); return next; });
        if (activeProjectId === projectId) { setActiveProjectId(null); navigateTo(Page.DASHBOARD); }
    } catch (err) {}
  };

  const renderAppPhase = () => {
    if (isFetchingProjectFiles) return <ProcessingView headline="Syncing Documents..." subline="Retrieving your project files from secure storage." showDetails={false} />;
    if (!appState) return <DocumentUploader appState={{ phase: AppPhase.PROJECT_SETUP } as AppState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={() => navigateTo(Page.DASHBOARD)} />;
    const { phase, appError } = appState;
    switch (phase) {
      case AppPhase.PROJECT_SETUP:
      case AppPhase.ADDENDA_UPLOAD: return <DocumentUploader appState={appState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={handleReset} />;
      case AppPhase.INDEXING_FAILED:
      case AppPhase.ANALYSIS_FAILED:
         if (appError) {
            const isMismatch = appError.message.includes('Addendum Mismatch');
            const isStorageConfigError = appError.message.toLowerCase().includes('project-files');
            const retryAction = phase === AppPhase.ANALYSIS_FAILED && stagedFiles.addenda.length > 0 ? () => handleAnalysis(stagedFiles.addenda, false) : undefined;
            const bypassAction = isMismatch ? () => handleAnalysis(stagedFiles.addenda, true) : undefined;
            const secondaryAction = isStorageConfigError ? { label: "Use Guest Mode (Skip Cloud)", onClick: () => handleSetGuestUser(currentUser?.name || "Estimator") } : (bypassAction ? { label: "Bypass & Continue", onClick: bypassAction } : undefined);
            return <ErrorDisplay title={appError.title} message={appError.message} onReset={handleReset} onRetry={retryAction} secondaryAction={secondaryAction} />;
        }
        return <DocumentUploader appState={appState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={handleReset} />;
      case AppPhase.VERIFYING_CONSISTENCY: return <ProcessingView headline="Verifying..." subline="Checking document consistency." showDetails={false} onForceReset={handleReset} />;
      case AppPhase.INDEXING_IN_PROGRESS: return <ProcessingView headline="Indexing..." subline="Building your project blueprint." onForceReset={handleReset} items={["Validating structure...", "Extracting text...", "Finalizing blueprint..."]} />;
      case AppPhase.ANALYZING_ADDENDUM: return <ProcessingView headline="Analyzing..." subline="Cross-referencing addenda." onForceReset={handleReset} items={["Parsing instructions...", "Risk assessment...", "Matching content..."]} />;
      case AppPhase.MAPPING_CHANGES: return <ProcessingView headline="Locating..." subline="Pinpointing impact areas." onForceReset={handleReset} items={["Scanning targets...", "Computing coordinates...", "Building audit trail..."]} />;
      case AppPhase.RESULTS:
        return ( <ResultsView projectName={appState.projectName || ''} onUpdateProjectName={handleUpdateProjectName} changeLog={appState.changeLog} qaLog={appState.qaLog} setChangeLog={setChangeLog} baseDrawingsDoc={loadedDocs.baseDrawings} baseSpecsDoc={loadedDocs.baseSpecs} addendaDocs={loadedDocs.addenda} baseDrawingsPageCount={appState.baseDrawingsPageCount} baseSpecsPageCount={appState.baseSpecsPageCount} onStartOver={handleReset} onCreateChange={()=>{}} triageReport={appState.triageReport} addenda={appState.addenda} executiveSummary={appState.executiveSummary} summaryError={appState.summaryError} costAnalysisResult={appState.costAnalysisResult} costAnalysisError={appState.costAnalysisError} onGenerateCostImpact={handleGenerateCostImpact} isSummaryLoading={isSummaryLoading} onGenerateSummary={handleGenerateExecutiveSummary} onGenerateTriageReport={handleGenerateTriageReport} isTriageLoading={isTriageLoading} triageError={triageError} onAnalyzeAdditionalAddenda={handleAnalysis} isAnalyzingIncrementally={isAnalyzingIncrementally} isSaving={isSaving} versions={appState.versions} updateProjectState={updateActiveProjectState} /> );
      default: return <p>Unknown state.</p>;
    }
  };
  
  const renderCurrentPage = () => {
    if (isFetchingProjects && currentUser) return <ProcessingView headline="Welcome Back..." subline="Preparing your secure dashboard." showDetails={false} />;
    switch (currentPage) {
      case Page.DASHBOARD: return <UserDashboard currentUser={currentUser!} projects={projects} globalProjects={globalProjects} allUsers={allUsers} onStartNewProject={handleStartNewProject} onSelectProject={handleSelectProject} onSetMonitoringUrl={handleSetMonitoringUrl} onCheckForUpdate={handleCheckForUpdate} onDeleteProject={handleDeleteProject} onUpdateProfile={handleUpdateProfile} onUpdateUserRank={handleUpdateUserRank} />;
      case Page.LANDING: return <LandingPage onNavigateToHowItWorks={() => navigateTo(Page.HOW_IT_WORKS)} />;
      case Page.HOW_IT_WORKS: return <HowItWorksPage onGetStartedClick={() => navigateTo(Page.LOGIN)} />;
      case Page.LOGIN: return <LoginPage onGuestLogin={handleSetGuestUser} />;
      case Page.APP: return renderAppPhase();
      case Page.PRICING: return <PricingPage onGetStartedClick={() => navigateTo(Page.LOGIN)} />;
      default: return <LandingPage onNavigateToHowItWorks={() => navigateTo(Page.HOW_IT_WORKS)} />;
    }
  }

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Logo onClick={() => navigateTo(Page.LANDING)} className="cursor-pointer" />
          <nav className="flex items-center space-x-2">
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.HOW_IT_WORKS); }} className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md">How It Works</a>
             {currentUser ? (
                <div className="flex items-center gap-3">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.DASHBOARD); }} className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md">Dashboard</a>
                    
                    <div className="flex items-center gap-3 ml-2">
                        <div className="relative" ref={notificationRef}>
                            <button 
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all relative border shadow-sm ${isNotificationOpen ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-brand-600'}`} 
                                title="Notifications"
                            >
                                <BellIcon className="h-5.5 w-5.5" />
                                {notifications.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-brand-600 rounded-full border-2 border-white flex items-center justify-center">
                                        <span className="text-[8px] text-white font-bold">{notifications.length}</span>
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotificationOpen && (
                                    <MotionDiv 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800">Notifications</h3>
                                            <button 
                                                onClick={() => setNotifications([])}
                                                className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {notifications.length > 0 ? notifications.map(notif => (
                                                <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="text-sm font-bold text-slate-800">{notif.title}</h4>
                                                        <span className="text-[10px] font-medium text-slate-400">{getTimeAgo(notif.timestamp)}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed">{notif.description}</p>
                                                </div>
                                            )) : (
                                                <div className="p-12 text-center">
                                                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <CheckCircleIcon className="h-6 w-6 text-slate-300" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-400">All caught up!</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                                            <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-brand-600 transition-colors">View All Activity</button>
                                        </div>
                                    </MotionDiv>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <div className="relative" ref={profileRef}>
                            <button 
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                className={`h-9 w-9 rounded-full overflow-hidden border-2 transition-all shadow-sm ${isProfileDropdownOpen ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-400'}`}
                                title="My Account"
                            >
                                {currentUser.email === MASTER_ACCOUNT_EMAIL ? (
                                    <BrandAvatar className="h-full w-full" />
                                ) : currentUser.avatarUrl ? (
                                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <UserIcon className="h-6 w-6" />
                                    </div>
                                )}
                            </button>

                            <AnimatePresence>
                                {isProfileDropdownOpen && (
                                    <MotionDiv 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                                    >
                                        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-white">
                                                {currentUser.email === MASTER_ACCOUNT_EMAIL ? (
                                                    <BrandAvatar className="h-full w-full" />
                                                ) : currentUser.avatarUrl ? (
                                                    <img src={currentUser.avatarUrl} className="h-full w-full object-cover" />
                                                ) : (
                                                    <UserIcon className="h-6 w-6 text-slate-300 m-2" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-black text-slate-900 truncate">{currentUser.name}</p>
                                                    {currentUser.role === 'admin' && <span title="Master Owner"><ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600" /></span>}
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <button 
                                                onClick={() => { navigateTo(Page.DASHBOARD); setIsProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors group"
                                            >
                                                <GearIcon className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                                                My Dashboard
                                            </button>
                                            {currentUser.role === 'admin' && (
                                                 <button 
                                                    onClick={() => { setIsProfileDropdownOpen(false); navigateTo(Page.DASHBOARD); }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50 rounded-xl transition-colors group"
                                                >
                                                    <ShieldCheckIcon className="h-5 w-5 text-brand-400 group-hover:text-brand-600" />
                                                    Admin Portal
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => { setIsProfileDropdownOpen(false); navigateTo(Page.DASHBOARD); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors group"
                                            >
                                                <UserIcon className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                                                Edit Profile
                                            </button>
                                            <button 
                                                onClick={() => { navigateTo(Page.PRICING); setIsProfileDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors group"
                                            >
                                                <ArrowPathIcon className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                                                Subscription
                                            </button>
                                            <div className="h-px bg-slate-100 my-2 mx-2"></div>
                                            <button 
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors group"
                                            >
                                                <ClockIcon className="h-5 w-5 text-red-300 group-hover:text-red-500 rotate-180" />
                                                Logout
                                            </button>
                                        </div>
                                    </MotionDiv>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            ) : <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.LOGIN); }} className="px-4 py-2 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md">Login</a>}
          </nav>
        </div>
      </header>
      <main className="flex-grow w-full">
        <ErrorBoundary onReset={handleReset}>{renderCurrentPage()}</ErrorBoundary>
      </main>
    </div>
  );
}
