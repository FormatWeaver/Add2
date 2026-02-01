
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppPhase, AppChangeLogItem, ChangeStatus, Page, ConformingPlan, ChangeType, AIConformingPlan, PageMapItem, TriageReportData, ProjectFile, QAndAItem, AppError, ConformedPageInfo, User, MonitoringStatus } from './types';
import DocumentUploader from './components/DocumentUploader';
import ProcessingView from './components/ProcessingView';
import ResultsView from './components/ResultsView';
import LandingPage from './components/LandingPage';
import { HowItWorksPage } from './components/HowItWorksPage';
import { LoginPage } from './components/LoginPage';
import { PricingPage } from './components/PricingPage';
import { generateConformingPlan, generateTriageReport, generateExecutiveSummary, generateCostImpactAnalysis, verifyDocumentConsistency } from './services/geminiService';
import { Logo } from './components/Logo';
import { mapChangesToPages } from './services/pageMapperService';
import * as pdfjsLib from 'pdfjs-dist';
import ErrorBoundary from './components/ErrorBoundary';
import { ErrorDisplay } from './components/ErrorDisplay';
import { UserIcon } from './components/icons';
import { UserDashboard } from './components/UserDashboard';
import { supabase } from './services/supabaseClient';
import { fetchProjects, saveProject, uploadFile, downloadFile, deleteProject } from './services/projectService';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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

export default function App() {
  const [projects, setProjects] = useState<Map<string, AppState>>(new Map());
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

  const appState = activeProjectId ? projects.get(activeProjectId) : null;

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  // Auth & Session - RUN ONCE on mount
  useEffect(() => {
    if (!supabase) return;
    
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) {
            setCurrentUser({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata.name || session.user.email!.split('@')[0],
            });
        }
    }).catch(() => {});

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
            setCurrentUser({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata.name || session.user.email!.split('@')[0],
            });
        } else {
            setCurrentUser(prev => prev?.id.startsWith('guest-') ? prev : null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Projects - Occurs when user ID becomes available
  useEffect(() => {
    if (currentUser && !currentUser.id.startsWith('guest-')) {
        setIsFetchingProjects(true);
        fetchProjects(currentUser.id)
            .then(userProjects => setProjects(userProjects))
            .finally(() => setIsFetchingProjects(false));
    } else {
        setIsFetchingProjects(false);
    }
  }, [currentUser?.id]);

  // Routing Logic
  useEffect(() => {
    if (currentUser) {
        if (currentPage === Page.LOGIN || currentPage === Page.LANDING) {
            setCurrentPage(Page.DASHBOARD);
        }
    } else {
        if (currentPage === Page.APP || currentPage === Page.DASHBOARD) {
            setCurrentPage(Page.LOGIN);
        }
    }
  }, [!!currentUser, currentPage]);

  const updateActiveProjectState = (updater: (prevState: AppState) => AppState, targetId?: string) => {
    const idToUpdate = targetId || activeProjectIdRef.current;
    if (!idToUpdate) return;

    setProjects(prevProjects => {
        const nextProjects = new Map(prevProjects);
        let currentProjectState = nextProjects.get(idToUpdate);
        if (!currentProjectState) currentProjectState = createInitialAppState(idToUpdate);
        
        const newProjectState = updater({ ...currentProjectState, currentUser });
        if (currentUser && !currentUser.id.startsWith('guest-')) {
            saveProject(newProjectState);
        }
        nextProjects.set(idToUpdate, newProjectState);
        return nextProjects;
    });
  };

  const handleSetGuestUser = (name: string) => {
      setCurrentUser({
          id: `guest-${crypto.randomUUID()}`,
          name: name || 'Guest User',
          email: 'guest@example.com'
      });
  };

  const handleCreateIndexing = async (baseDrawingsFile: File | null, baseSpecsFile: File | null, projectName: string) => {
    if (!currentUser || !projectName.trim()) return;
    const newProjectId = crypto.randomUUID();
    const newProjectState = createInitialAppState(newProjectId, projectName);
    newProjectState.phase = AppPhase.INDEXING_IN_PROGRESS;
    newProjectState.currentUser = currentUser;
    
    setProjects(prev => {
        const next = new Map(prev);
        next.set(newProjectId, newProjectState);
        return next;
    });
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
        
        updateActiveProjectState(prev => ({
            ...prev,
            baseDrawings: drawingsProjectFile,
            baseSpecs: specsProjectFile,
            baseDrawingsPageCount: drawingsDoc?.numPages || 0,
            baseSpecsPageCount: specsDoc?.numPages || 0,
            phase: AppPhase.ADDENDA_UPLOAD,
        }), newProjectId);

    } catch (err: any) {
        console.error("Indexing Error:", err);
        updateActiveProjectState(prev => ({
            ...prev, phase: AppPhase.INDEXING_FAILED,
            appError: { 
                title: 'Setup Failed', 
                message: err.message.toLowerCase().includes('project-files') 
                    ? err.message.replace('STORAGE_CONFIG_ERROR: ', '') 
                    : err.message || "Could not process files." 
            }
        }), newProjectId);
    }
  };
  
  const handleAnalysis = async (addendaFiles: File[], skipConsistency = false) => {
    if (!appState || !currentUser || addendaFiles.length === 0) return;
    const targetId = appState.projectId;
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
        } else {
            uploadedAddenda = await Promise.all(addendaFiles.map(f => uploadFile(currentUser.id, targetId, f)));
        }

        const loadedArray = await Promise.all(addendaFiles.map(async f => ({ name: f.name, doc: await pdfjsLib.getDocument(await f.arrayBuffer()).promise })));
        setLoadedDocs(prev => ({ ...prev, addenda: new Map([...prev.addenda, ...loadedArray.map(i => [i.name, i.doc] as [string, pdfjsLib.PDFDocumentProxy])]) }));
        setStagedFiles(prev => ({ ...prev, addenda: [...prev.addenda, ...addendaFiles] }));
        
        const { plan: aiPlan } = await generateConformingPlan(addendaFiles, bDraw, bSpec);
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
        }));
        
        if (isInitial) updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.MAPPING_CHANGES }), targetId);
        const mapped = await mapChangesToPages(newChanges, bDraw, bSpec);

        updateActiveProjectState(prev => ({
            ...prev, phase: AppPhase.RESULTS,
            addenda: [...prev.addenda, ...uploadedAddenda],
            changeLog: [...prev.changeLog, ...mapped], 
            qaLog: [...prev.qaLog, ...newQa],
        }), targetId);
    } catch (err: any) {
      updateActiveProjectState(prev => ({ 
          ...prev, phase: isInitial ? AppPhase.ANALYSIS_FAILED : prev.phase, 
          appError: { title: 'Analysis Failed', message: err.message } 
      }), targetId);
    } finally {
        setIsAnalyzingIncrementally(false);
    }
  };

  const handleGenerateTriageReport = async () => {
    if (!appState || appState.addenda.length === 0) return;
    setIsTriageLoading(true); setTriageError(null);
    try {
        const { report } = await generateTriageReport(stagedFiles.addenda);
        updateActiveProjectState(prev => ({ ...prev, triageReport: report }));
    } catch (err: any) { setTriageError(err.message); } 
    finally { setIsTriageLoading(false); }
  };

  const handleGenerateExecutiveSummary = async () => {
    if (!appState || appState.changeLog.length === 0) return;
    setIsSummaryLoading(true);
    try {
        const summary = await generateExecutiveSummary(appState.changeLog);
        updateActiveProjectState(prev => ({ ...prev, executiveSummary: summary, summaryError: null }));
    } catch (err: any) { updateActiveProjectState(prev => ({ ...prev, summaryError: err.message })); } 
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

  const handleReset = () => {
      if (activeProjectId) {
          const project = projects.get(activeProjectId);
          updateActiveProjectState(() => createInitialAppState(activeProjectId, project?.projectName));
      }
      setCurrentPage(Page.DASHBOARD);
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setProjects(new Map());
    setCurrentPage(Page.LANDING);
    setActiveProjectId(null);
  };

  const setChangeLog = (newLog: AppChangeLogItem[] | ((prev: AppChangeLogItem[]) => AppChangeLogItem[])) => {
      updateActiveProjectState(prev => ({
        ...prev, changeLog: typeof newLog === 'function' ? newLog(prev.changeLog) : newLog,
      }));
  };
  
  const navigateTo = (page: Page) => { setCurrentPage(page); window.scrollTo(0, 0); };
  const handleStartNewProject = () => { setActiveProjectId(null); setStagedFiles({ baseDrawings: null, baseSpecs: null, addenda: [] }); navigateTo(Page.APP); };
  
  const handleSelectProject = async (projectId: string) => {
    const project = projects.get(projectId);
    if (!project) return;
    setActiveProjectId(projectId);
    setIsFetchingProjectFiles(true);
    try {
        const filePromises = [
            project.baseDrawings ? downloadFile(project.baseDrawings.path) : Promise.resolve(null),
            project.baseSpecs ? downloadFile(project.baseSpecs.path) : Promise.resolve(null),
            ...project.addenda.map(a => downloadFile(a.path)),
        ];
        const [bDraw, bSpec, ...addendaF] = await Promise.all(filePromises);
        const docPromises = [
            bDraw ? pdfjsLib.getDocument(await bDraw.arrayBuffer()).promise : Promise.resolve(null),
            bSpec ? pdfjsLib.getDocument(await bSpec.arrayBuffer()).promise : Promise.resolve(null),
            ...addendaF.map(async f => f ? ({ name: f.name, doc: await pdfjsLib.getDocument(await f.arrayBuffer()).promise }) : null)
        ];
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
        if (activeProjectId === projectId) { setActiveProjectId(null); navigateTo(Page.DASHBOARD); }
    } catch (err) {}
  };

  const renderAppPhase = () => {
    if (isFetchingProjectFiles) return <ProcessingView headline="Syncing Documents..." subline="Retrieving your project files from secure storage." showDetails={false} />;
    if (!appState) return <DocumentUploader appState={{ phase: AppPhase.PROJECT_SETUP } as AppState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={() => navigateTo(Page.DASHBOARD)} />;
    const { phase, appError } = appState;
    switch (phase) {
      case AppPhase.PROJECT_SETUP:
      case AppPhase.ADDENDA_UPLOAD:
        return <DocumentUploader appState={appState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={handleReset} />;
      case AppPhase.INDEXING_FAILED:
      case AppPhase.ANALYSIS_FAILED:
         if (appError) {
            const isMismatch = appError.message.includes('Addendum Mismatch');
            const isStorageConfigError = appError.message.toLowerCase().includes('project-files');
            const retryAction = phase === AppPhase.ANALYSIS_FAILED && stagedFiles.addenda.length > 0 ? () => handleAnalysis(stagedFiles.addenda, false) : undefined;
            const bypassAction = isMismatch ? () => handleAnalysis(stagedFiles.addenda, true) : undefined;
            
            const secondaryAction = isStorageConfigError ? {
                label: "Use Guest Mode (Skip Cloud Config)",
                onClick: () => handleSetGuestUser(currentUser?.name || "Estimator")
            } : (bypassAction ? { label: "Bypass & Continue", onClick: bypassAction } : undefined);

            return <ErrorDisplay 
                title={appError.title} 
                message={appError.message} 
                onReset={handleReset} 
                onRetry={retryAction} 
                secondaryAction={secondaryAction}
            />;
        }
        return <DocumentUploader appState={appState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={handleReset} />;
      case AppPhase.VERIFYING_CONSISTENCY: return <ProcessingView headline="Verifying..." subline="Matching documents to project profile." showDetails={false} onForceReset={handleReset} />;
      case AppPhase.INDEXING_IN_PROGRESS: return <ProcessingView headline="Indexing..." subline="Building your project blueprint." onForceReset={handleReset} items={["Validating structure...", "Extracting text...", "Finalizing blueprint..."]} />;
      case AppPhase.ANALYZING_ADDENDUM: return <ProcessingView headline="Analyzing..." subline="Cross-referencing addenda." onForceReset={handleReset} items={["Parsing instructions...", "Matching content...", "Detecting changes..."]} />;
      case AppPhase.MAPPING_CHANGES: return <ProcessingView headline="Locating..." subline="Pinpointing changes." onForceReset={handleReset} items={["Scanning targets...", "Computing coordinates...", "Finalizing log..."]} />;
      case AppPhase.RESULTS:
        return (
          <ResultsView 
            changeLog={appState.changeLog} qaLog={appState.qaLog} setChangeLog={setChangeLog}
            baseDrawingsDoc={loadedDocs.baseDrawings} baseSpecsDoc={loadedDocs.baseSpecs} addendaDocs={loadedDocs.addenda}
            baseDrawingsPageCount={appState.baseDrawingsPageCount} baseSpecsPageCount={appState.baseSpecsPageCount}
            onStartOver={handleReset} onCreateChange={()=>{}} triageReport={appState.triageReport}
            addenda={appState.addenda} executiveSummary={appState.executiveSummary} summaryError={appState.summaryError}
            costAnalysisResult={appState.costAnalysisResult} costAnalysisError={appState.costAnalysisError}
            onGenerateCostImpact={handleGenerateCostImpact} isSummaryLoading={isSummaryLoading} onGenerateSummary={handleGenerateExecutiveSummary}
            onGenerateTriageReport={handleGenerateTriageReport} isTriageLoading={isTriageLoading} triageError={triageError}
            onAnalyzeAdditionalAddenda={handleAnalysis} isAnalyzingIncrementally={isAnalyzingIncrementally}
          />
        );
      default: return <p>Unknown state.</p>;
    }
  };
  
  const renderCurrentPage = () => {
    if (isFetchingProjects && currentUser) return <ProcessingView headline="Welcome Back..." subline="Preparing your secure dashboard." showDetails={false} />;
    switch (currentPage) {
      case Page.DASHBOARD: return <UserDashboard currentUser={currentUser!} projects={projects} onStartNewProject={handleStartNewProject} onSelectProject={handleSelectProject} onSetMonitoringUrl={()=>{}} onCheckForUpdate={()=>{}} onDeleteProject={handleDeleteProject} />;
      case Page.LANDING: return <LandingPage onNavigateToHowItWorks={() => navigateTo(Page.HOW_IT_WORKS)} />;
      case Page.HOW_IT_WORKS: return <HowItWorksPage onGetStartedClick={() => navigateTo(Page.LOGIN)} />;
      case Page.LOGIN: return <LoginPage onGuestLogin={handleSetGuestUser} />;
      case Page.APP: return renderAppPhase();
      case Page.PRICING: return <PricingPage onGetStartedClick={() => navigateTo(Page.LOGIN)} />;
      default: return <LandingPage onNavigateToHowItWorks={() => navigateTo(Page.HOW_IT_WORKS)} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <Logo onClick={() => navigateTo(Page.LANDING)} className="cursor-pointer" />
          <nav className="flex items-center space-x-2">
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.HOW_IT_WORKS); }} className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md">How It Works</a>
             {currentUser ? (
                <div className="flex items-center gap-4">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.DASHBOARD); }} className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md">Dashboard</a>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md">Logout</button>
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center sm:ml-2"><UserIcon className="h-5 w-5 text-slate-500" /></div>
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
