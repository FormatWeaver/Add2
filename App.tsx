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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [currentPage, setCurrentPage] = useState<Page>(Page.LANDING);
  const [scrollToBeta, setScrollToBeta] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [isAnalyzingIncrementally, setIsAnalyzingIncrementally] = useState(false);
  
  const [loadedDocs, setLoadedDocs] = useState<LoadedPdfDocs>({ baseDrawings: null, baseSpecs: null, addenda: new Map() });
  const [stagedFiles, setStagedFiles] = useState<LoadedFiles>({ baseDrawings: null, baseSpecs: null, addenda: [] });

  // Loading states for Supabase data
  const [isFetchingProjects, setIsFetchingProjects] = useState(true);
  const [isFetchingProjectFiles, setIsFetchingProjectFiles] = useState(false);

  const appState = activeProjectId ? projects.get(activeProjectId) : null;

  // Effect 1: Handle Authentication State Changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            const appUser: User = {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata.name || session.user.email!.split('@')[0],
            };
            setCurrentUser(appUser);
        } else {
            setCurrentUser(null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect 2: Handle Data Fetching based on User
  useEffect(() => {
    if (currentUser) {
        setIsFetchingProjects(true);
        fetchProjects(currentUser.id)
            .then(userProjects => {
                setProjects(userProjects);
            })
            .catch(error => {
                console.error("Failed to fetch projects:", error);
                setProjects(new Map());
            })
            .finally(() => {
                setIsFetchingProjects(false);
            });
    } else {
        // No user, clear projects and ensure loading is false
        setProjects(new Map());
        setActiveProjectId(null);
        setIsFetchingProjects(false);
    }
  }, [currentUser]);

  // Effect 3: Handle Navigation based on Auth & Loading State
  useEffect(() => {
    if (isFetchingProjects) {
        return; // Don't navigate while initial data is loading
    }

    if (currentUser) {
        if (currentPage === Page.LOGIN || currentPage === Page.LANDING) {
            navigateTo(Page.DASHBOARD);
        }
    } else {
        // Not fetching and no user
        if (currentPage === Page.APP || currentPage === Page.DASHBOARD) {
            navigateTo(Page.LOGIN);
        }
    }
  }, [currentUser, isFetchingProjects, currentPage]);

  const updateActiveProjectState = (updater: (prevState: AppState) => AppState) => {
    if (!activeProjectId) return;
    setProjects(prevProjects => {
        const currentProjectState = prevProjects.get(activeProjectId);
        if (!currentProjectState) return prevProjects;
        const newProjectState = updater({ ...currentProjectState, currentUser });
        // Save to Supabase
        saveProject(newProjectState).catch(error => console.error("Failed to save project:", error));
        const newProjects = new Map(prevProjects);
        newProjects.set(activeProjectId, newProjectState);
        return newProjects;
    });
  };

  const handleCreateIndexing = async (baseDrawingsFile: File | null, baseSpecsFile: File | null, projectName: string) => {
    if (!currentUser || !projectName.trim()) return;
    if (!baseDrawingsFile && !baseSpecsFile) return;

    const newProjectId = crypto.randomUUID();
    const newProjectState = createInitialAppState(newProjectId, projectName);
    setProjects(prev => new Map(prev).set(newProjectId, { ...newProjectState, phase: AppPhase.INDEXING_IN_PROGRESS, currentUser }));
    setActiveProjectId(newProjectId);
    
    try {
        const [drawingsProjectFile, specsProjectFile] = await Promise.all([
            baseDrawingsFile ? uploadFile(currentUser.id, newProjectId, baseDrawingsFile) : Promise.resolve(null),
            baseSpecsFile ? uploadFile(currentUser.id, newProjectId, baseSpecsFile) : Promise.resolve(null)
        ]);
        
        setStagedFiles({ baseDrawings: baseDrawingsFile, baseSpecs: baseSpecsFile, addenda: [] });

        const [drawingsDoc, specsDoc] = await Promise.all([
            baseDrawingsFile ? pdfjsLib.getDocument(await baseDrawingsFile.arrayBuffer()).promise : Promise.resolve(null),
            baseSpecsFile ? pdfjsLib.getDocument(await baseSpecsFile.arrayBuffer()).promise : Promise.resolve(null),
        ]);
        setLoadedDocs({ baseDrawings: drawingsDoc, baseSpecs: specsDoc, addenda: new Map() });
        
        // FIX: Replaced updateActiveProjectState with a direct functional update to setProjects.
        // This avoids the stale closure issue on `activeProjectId`, which caused the app to get stuck
        // on the loading screen because the final state update was being skipped.
        setProjects(prevProjects => {
            const newProjects = new Map(prevProjects);
            const projectToUpdate = newProjects.get(newProjectId);

            if (!projectToUpdate) {
                console.error(`Project with ID ${newProjectId} was not found during creation.`);
                return prevProjects;
            }

            const updatedProjectState: AppState = {
                ...projectToUpdate,
                baseDrawings: drawingsProjectFile,
                baseSpecs: specsProjectFile,
                baseDrawingsPageCount: drawingsDoc?.numPages || 0,
                baseSpecsPageCount: specsDoc?.numPages || 0,
                phase: AppPhase.ADDENDA_UPLOAD,
                lastModified: Date.now(),
            };
            
            saveProject(updatedProjectState).catch(error => {
                console.error("Failed to save newly created project state:", error);
            });
            
            newProjects.set(newProjectId, updatedProjectState);
            return newProjects;
        });

    } catch (err) {
        console.error("Error during indexing/upload:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        
        // Use a direct update here as well to ensure the error state is set correctly.
        setProjects(prevProjects => {
            const newProjects = new Map(prevProjects);
            const projectToUpdate = newProjects.get(newProjectId);
            if (projectToUpdate) {
                const failedState = { 
                    ...projectToUpdate, 
                    phase: AppPhase.INDEXING_FAILED, 
                    appError: { 
                        title: 'Blueprint Creation Failed', 
                        message: `Could not process or upload documents. Please try again. Error: ${errorMessage}` 
                    }
                };
                newProjects.set(newProjectId, failedState);
                saveProject(failedState).catch(e => console.error("Failed to save error state", e));
            }
            return newProjects;
        });
    }
  };
  
  const handleAnalysis = async (addendaFiles: File[]) => {
    if (!appState || !currentUser || addendaFiles.length === 0) return;

    const isInitialAnalysis = appState.addenda.length === 0;
    if (isInitialAnalysis) {
        updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.VERIFYING_CONSISTENCY }));
    } else {
        setIsAnalyzingIncrementally(true);
    }
    updateActiveProjectState(prev => ({ ...prev, appError: null }));

    try {
        const { baseDrawings: baseDrawingsFile, baseSpecs: baseSpecsFile } = stagedFiles;
        
        const verificationResult = await verifyDocumentConsistency(
            [...addendaFiles, baseDrawingsFile, baseSpecsFile],
            "Do the addenda files belong to the same project as the base documents?"
        );
        if (!verificationResult.is_consistent) throw new Error(`Addendum Mismatch: ${verificationResult.reasoning}`);

        if (isInitialAnalysis) updateActiveProjectState(prev => ({...prev, phase: AppPhase.ANALYZING_ADDENDUM }));
        
        const uploadedAddenda: ProjectFile[] = await Promise.all(
            addendaFiles.map(file => uploadFile(currentUser.id, appState.projectId, file))
        );

        const addendaDocPromises = addendaFiles.map(async file => ({
            name: file.name, doc: await pdfjsLib.getDocument(await file.arrayBuffer()).promise
        }));
        const loadedAddendaArray = await Promise.all(addendaDocPromises);
        setLoadedDocs(prev => ({ ...prev, addenda: new Map([...prev.addenda, ...loadedAddendaArray.map(item => [item.name, item.doc] as [string, pdfjsLib.PDFDocumentProxy])])}));
        setStagedFiles(prev => ({...prev, addenda: [...prev.addenda, ...addendaFiles] }));
        
        const { plan: aiPlan } = await generateConformingPlan(addendaFiles, baseDrawingsFile, baseSpecsFile);
        
        const currentMaxId = appState.changeLog.reduce((max, item) => Math.max(item.id, max), -1);
        let idCounter = currentMaxId + 1;

        const newQaItems = (aiPlan.questions_and_answers || []).map(qa => ({ ...qa, id: idCounter++ }));
        const normalizeFilename = (path: string) => path.substring(path.lastIndexOf('/') + 1);

        const newChangeLogItems: AppChangeLogItem[] = aiPlan.change_instructions.map(instr => ({
            id: idCounter++, status: ChangeStatus.APPROVED, addendum_name: normalizeFilename(instr.source_addendum_file),
            change_type: instr.change_type, source_original_document: instr.search_target.document_type,
            description: instr.human_readable_description, location_hint: instr.search_target.location_hint,
            spec_section: instr.spec_section, discipline: instr.discipline,
            semantic_search_query: instr.search_target.semantic_search_query,
            exact_text_to_find: instr.data_payload.text_to_find, new_text_to_insert: instr.data_payload.replacement_text,
            target_page_number: instr.data_payload.original_page_number_to_affect,
            insert_after_original_page_number: instr.data_payload.insert_after_original_page_number,
            source_page: instr.data_payload.addendum_source_page_number || instr.data_payload.source_page_in_addendum || 0,
            original_page_number: undefined,
        }));
        
        if (isInitialAnalysis) updateActiveProjectState(prev => ({ ...prev, phase: AppPhase.MAPPING_CHANGES }));
        
        const mappedNewChanges = await mapChangesToPages(newChangeLogItems, baseDrawingsFile, baseSpecsFile);

        updateActiveProjectState(prev => ({
            ...prev, phase: AppPhase.RESULTS,
            addenda: [...prev.addenda, ...uploadedAddenda],
            changeLog: [...prev.changeLog, ...mappedNewChanges], 
            qaLog: [...prev.qaLog, ...newQaItems],
            activeDocumentTitle: addendaFiles[0]?.name || prev.activeDocumentTitle, 
        }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      updateActiveProjectState(prev => ({ ...prev, phase: isInitialAnalysis ? AppPhase.ANALYSIS_FAILED : prev.phase, appError: { title: 'Analysis Failed', message: errorMessage } }));
    } finally {
        if (!isInitialAnalysis) setIsAnalyzingIncrementally(false);
    }
  };
  
  const handleGenerateTriageReport = async () => { /* ... (no changes needed) ... */ };
  const handleGenerateExecutiveSummary = async () => { /* ... (no changes needed) ... */ };
  const handleGenerateCostImpact = async () => { /* ... (no changes needed) ... */ };

  const handleReset = () => {
      if (activeProjectId && projects.has(activeProjectId)) {
          const projectToReset = projects.get(activeProjectId)!;
          const newProjectState = createInitialAppState(activeProjectId, projectToReset.projectName);
          const updatedStateWithUser = { ...newProjectState, currentUser };
          setProjects(prev => new Map(prev).set(activeProjectId, updatedStateWithUser));
          saveProject(updatedStateWithUser).catch(e => console.error("Failed to save reset project:", e));
      }
      navigateTo(Page.DASHBOARD);
  };
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProjects(new Map());
    setActiveProjectId(null);
    setCurrentUser(null);
    setLoadedDocs({ baseDrawings: null, baseSpecs: null, addenda: new Map() });
    setStagedFiles({ baseDrawings: null, baseSpecs: null, addenda: [] });
    navigateTo(Page.LANDING);
  };

  const setChangeLog = (newChangeLog: AppChangeLogItem[] | ((prevLog: AppChangeLogItem[]) => AppChangeLogItem[])) => {
      updateActiveProjectState(prev => ({
        ...prev,
        changeLog: typeof newChangeLog === 'function' ? newChangeLog(prev.changeLog) : newChangeLog,
      }));
  };
  
  const navigateTo = (page: Page) => { setCurrentPage(page); window.scrollTo(0, 0); };
  const handleStartNewProject = () => { setActiveProjectId(null); setStagedFiles({ baseDrawings: null, baseSpecs: null, addenda: [] }); navigateTo(Page.APP); };
  
  const handleSelectProject = async (projectId: string) => {
    const project = projects.get(projectId);
    if (!project) return;
    
    // Reset monitoring status if user is acting on a "found" notification
    if (project.monitoringStatus === 'found') {
        const updatedProject = { ...project, monitoringStatus: 'idle' as MonitoringStatus, lastModified: Date.now() };
        setProjects(prev => new Map(prev).set(projectId, updatedProject));
        saveProject(updatedProject);
    }

    setActiveProjectId(projectId);
    
    // On-demand file loading
    setIsFetchingProjectFiles(true);
    try {
        const filePromises: Promise<File | null>[] = [
            project.baseDrawings ? downloadFile(project.baseDrawings.path) : Promise.resolve(null),
            project.baseSpecs ? downloadFile(project.baseSpecs.path) : Promise.resolve(null),
            ...project.addenda.map(a => downloadFile(a.path)),
        ];
        const [baseDrawingsFile, baseSpecsFile, ...addendaFiles] = await Promise.all(filePromises);
        
        const docPromises = [
            baseDrawingsFile ? pdfjsLib.getDocument(await baseDrawingsFile.arrayBuffer()).promise : Promise.resolve(null),
            baseSpecsFile ? pdfjsLib.getDocument(await baseSpecsFile.arrayBuffer()).promise : Promise.resolve(null),
            ...addendaFiles.map(async f => f ? ({ name: f.name, doc: await pdfjsLib.getDocument(await f.arrayBuffer()).promise }) : null)
        ];
        const [drawingsDoc, specsDoc, ...addendaDocs] = await Promise.all(docPromises);
        
        setStagedFiles({ baseDrawings: baseDrawingsFile, baseSpecs: baseSpecsFile, addenda: addendaFiles.filter((f): f is File => f !== null) });
        const addendaMap = new Map(addendaDocs.filter(Boolean).map(item => [item!.name, item!.doc] as [string, pdfjsLib.PDFDocumentProxy]));
        setLoadedDocs({ baseDrawings: drawingsDoc, baseSpecs: specsDoc, addenda: addendaMap });
        
        navigateTo(Page.APP);
    } catch (error) {
        console.error("Failed to download project files:", error);
        alert("Could not load project files. They may have been deleted or there's a network issue.");
        setActiveProjectId(null); // Deselect project on failure
    } finally {
        setIsFetchingProjectFiles(false);
    }
  };

  const handleSetMonitoringUrl = (projectId: string, url: string) => {
    setProjects(prevProjects => {
        const project = prevProjects.get(projectId);
        if (!project) return prevProjects;
        // FIX: Explicitly type the new state object to ensure it conforms to AppState, resolving the type error for `monitoringStatus`.
        const newProjectState: AppState = {
            ...project,
            monitoringUrl: url,
            monitoringStatus: url ? 'idle' : undefined,
            lastModified: Date.now(),
        };
        saveProject(newProjectState);
        const newProjects = new Map(prevProjects);
        newProjects.set(projectId, newProjectState);
        return newProjects;
    });
  };

  const handleCheckForUpdate = (projectId: string) => {
    setProjects(prevProjects => {
        const project = prevProjects.get(projectId);
        if (!project || !project.monitoringUrl) return prevProjects;
        const newProjectState: AppState = { ...project, monitoringStatus: 'checking', lastChecked: Date.now() };
        const newProjects = new Map(prevProjects);
        newProjects.set(projectId, newProjectState);
        return newProjects;
    });

    // Simulate AI check. In a real app, this would call a Supabase Edge Function.
    setTimeout(() => {
        setProjects(prevProjects => {
            const project = prevProjects.get(projectId);
            if (!project) return prevProjects;
            
            // For demo purposes, we'll find a new addendum.
            const newProjectState = { ...project, monitoringStatus: 'found' as MonitoringStatus, lastModified: Date.now() };
            saveProject(newProjectState);
            const newProjects = new Map(prevProjects);
            newProjects.set(projectId, newProjectState);
            return newProjects;
        });
    }, 3000); // 3-second delay for simulation
  };
  
  const handleDeleteProject = async (projectId: string) => {
    if (!currentUser) return;
    try {
        await deleteProject(currentUser.id, projectId);
        setProjects(prevProjects => {
            const newProjects = new Map(prevProjects);
            newProjects.delete(projectId);
            return newProjects;
        });
        if (activeProjectId === projectId) {
            setActiveProjectId(null);
            navigateTo(Page.DASHBOARD);
        }
    } catch (error) {
        console.error("Error deleting project:", error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        alert(`Failed to delete project: ${message}`);
    }
  };

  const renderAppPhase = () => {
    if (isFetchingProjectFiles) {
        return <ProcessingView headline="Loading Project Files..." subline="Downloading and preparing your secure documents from the cloud." showDetails={false} />;
    }
    if (!appState) {
        return <DocumentUploader appState={{ phase: AppPhase.PROJECT_SETUP } as AppState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={() => navigateTo(Page.DASHBOARD)} />;
    }
    // ... rest of the renderAppPhase logic (no changes)
    const { phase, appError } = appState;
    switch (phase) {
      case AppPhase.PROJECT_SETUP:
      case AppPhase.ADDENDA_UPLOAD:
        return (
          <DocumentUploader
            appState={appState}
            stagedFiles={stagedFiles}
            onStartIndexing={handleCreateIndexing}
            onAnalyzeAddenda={handleAnalysis}
            onReset={handleReset}
          />
        );
      case AppPhase.INDEXING_FAILED:
      case AppPhase.ANALYSIS_FAILED:
         if (appError) {
            const canRetry = phase === AppPhase.ANALYSIS_FAILED && stagedFiles.addenda.length > 0;
            const retryAction = canRetry ? () => handleAnalysis(stagedFiles.addenda) : undefined;
            return <ErrorDisplay title={appError.title} message={appError.message} onReset={handleReset} onRetry={retryAction} />;
        }
        return <DocumentUploader appState={appState} stagedFiles={stagedFiles} onStartIndexing={handleCreateIndexing} onAnalyzeAddenda={handleAnalysis} onReset={handleReset} />;

      case AppPhase.VERIFYING_CONSISTENCY:
        return <ProcessingView headline="Verifying Document Consistency..." subline="Our AI is performing a quick check to ensure all your uploaded documents belong to the same project." />;
      
      case AppPhase.INDEXING_IN_PROGRESS:
        const headline = appState.projectName ? `Creating Project Blueprint for "${appState.projectName}"...` : "Creating Project Blueprint...";
        return <ProcessingView headline={headline} subline="This may take a minute. We're indexing every page for lightning-fast analysis later." />;
      case AppPhase.ANALYZING_ADDENDUM:
        return <ProcessingView headline="Analyzing Addenda..." subline="Our AI is now comparing your addenda to the Project Blueprint to identify all changes." />;
      case AppPhase.MAPPING_CHANGES:
        return <ProcessingView headline="Locating Changes..." subline="The AI has identified all changes. We're now pinpointing their exact location in your large documents." />;
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
      default:
        return <p>Unknown application phase.</p>;
    }
  };
  
  const renderCurrentPage = () => {
    if (isFetchingProjects) {
        return <ProcessingView headline="Loading Your Dashboard..." subline="Fetching your secure project data." showDetails={false} />;
    }
    switch (currentPage) {
      case Page.DASHBOARD:
        if (!currentUser) { navigateTo(Page.LOGIN); return null; }
        return <UserDashboard 
                  currentUser={currentUser} 
                  projects={projects} 
                  onStartNewProject={handleStartNewProject} 
                  onSelectProject={handleSelectProject} 
                  onSetMonitoringUrl={handleSetMonitoringUrl}
                  onCheckForUpdate={handleCheckForUpdate}
                  onDeleteProject={handleDeleteProject}
               />;
      // ... rest of renderCurrentPage (no changes)
      case Page.LANDING: return <LandingPage scrollToBeta={false} onDidScroll={()=>{}} onNavigateToHowItWorks={() => navigateTo(Page.HOW_IT_WORKS)} />;
      case Page.HOW_IT_WORKS: return <HowItWorksPage onGetStartedClick={() => navigateTo(Page.LOGIN)} />;
      case Page.LOGIN: return <LoginPage />;
      case Page.APP: if (!currentUser) { navigateTo(Page.LOGIN); return null; } return renderAppPhase();
      case Page.PRICING: return <PricingPage onGetStartedClick={() => navigateTo(Page.LOGIN)} />;
      default: return <LandingPage scrollToBeta={false} onDidScroll={()=>{}} onNavigateToHowItWorks={() => navigateTo(Page.HOW_IT_WORKS)} />;
    }
  }

  const mainContainerClass = (currentPage === Page.APP || currentPage === Page.DASHBOARD) ? 'h-[calc(100vh-4rem)]' : 'container mx-auto px-4 sm:px-6 lg:px-8 py-8';

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Logo onClick={() => navigateTo(Page.LANDING)} className="cursor-pointer" />
          <nav className="flex items-center space-x-2">
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.HOW_IT_WORKS); }} className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md transition-colors">How It Works</a>
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.PRICING); }} className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md transition-colors">Pricing</a>
             {currentUser ? (
                <div className="flex items-center gap-4">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.DASHBOARD); }} className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md transition-colors">Dashboard</a>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-slate-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 hidden sm:block">
                            {currentUser.name}
                        </span>
                    </div>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                        Logout
                    </button>
                </div>
            ) : (
                <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(Page.LOGIN); }} className="px-4 py-2 text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors">
                    Login
                </a>
            )}
          </nav>
        </div>
      </header>
      <main className={mainContainerClass}>
        <ErrorBoundary onReset={handleReset}>
          {renderCurrentPage()}
        </ErrorBoundary>
      </main>
    </div>
  );
}