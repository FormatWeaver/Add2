


export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

export enum Page {
  LANDING,
  APP,
  HOW_IT_WORKS,
  PRICING,
  LOGIN,
  DASHBOARD,
}

// V5.0: Simplified workflow to be sequential: Setup -> Addenda -> Results
export enum AppPhase {
  // Initial states
  PROJECT_SETUP,          // User is uploading BASE documents to create a blueprint.
  VERIFYING_CONSISTENCY,  // AI is checking if documents match before heavy processing.
  INDEXING_IN_PROGRESS,   // Backend (simulated) is creating the "Project Blueprint".
  INDEXING_FAILED,        // Something went wrong during indexing.
  
  // Addenda upload state
  ADDENDA_UPLOAD,         // Indexing is complete. User can now upload addenda for analysis.
  
  // Analysis states
  ANALYZING_ADDENDUM,     // Backend (simulated) is processing an addendum against the blueprint.
  MAPPING_CHANGES,        // Client-side: Locating AI-identified changes within the original documents.
  ANALYSIS_FAILED,        // Something went wrong during analysis.

  // Final state
  RESULTS,                // Displaying the final, interactive results view.
}

// V2.5: Simplified, more direct change types.
export enum ChangeType {
  TEXT_REPLACE = "TEXT_REPLACE",
  TEXT_DELETE = "TEXT_DELETE",
  TEXT_ADD = "TEXT_ADD",
  PAGE_REPLACE = "PAGE_REPLACE",
  PAGE_ADD = "PAGE_ADD",
  PAGE_DELETE = "PAGE_DELETE",
  GENERAL_NOTE = "GENERAL_NOTE",
}

export enum ChangeStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

// The core instruction for a page-level change from the AI
export interface PageMapItem {
    conformed_page_number: number;
    source_document: 'original' | 'addendum';
    source_page_number: number;
    reason: string; // AI's explanation for this action (e.g., "Replaces original page 55 (Sheet A-101)...")
    original_page_for_comparison?: number; // The page number in the original doc this replaces/deletes
    insert_after_original_page_number?: number; // For page adds
    addendum_name?: string; // V3.6: Name of the addendum file if source is addendum.
    original_document_type?: 'drawings' | 'specs'; // V3.7: Specifies which original doc this item belongs to
}

// V5.1: New robust, unified AI output structure based on semantic search.
// This replaces the old `TextChange` and `PageModification` types.
export interface ChangeInstruction {
    change_id: string;
    change_type: ChangeType;
    human_readable_description: string;
    source_addendum_file: string;
    search_target: {
        document_type: 'specs' | 'drawings';
        semantic_search_query: string;
        location_hint?: string;
    };
    data_payload: {
        // text
        text_to_find?: string;
        replacement_text?: string;
        source_page_in_addendum?: number;
        // page
        original_page_number_to_affect?: number;
        addendum_source_page_number?: number;
        insert_after_original_page_number?: number;
    };
    ai_confidence_score: number;
    discipline?: string;
    spec_section?: string;
}

// V6.0: Updated Q&A item to be more generic for both triage and main analysis
export interface QAndAItem {
    id?: number; 
    question: string;
    answer: string;
    impact_summary?: string; // From triage report
    source_addendum_file?: string; // From main analysis
    discipline?: string; // From main analysis
    spec_section?: string; // From main analysis
}

export interface AIConformingPlan {
    change_instructions: ChangeInstruction[];
    questions_and_answers?: QAndAItem[]; // V6.0: Added for Q&A extraction
}


// V2.5: The full plan, constructed inside the app from the AIConformingPlan.
// This is the data structure used by the UI.
export interface ConformingPlan {
    page_map: PageMapItem[];
    text_changes: AppChangeLogItem[]; // Kept for legacy compatibility but may be refactored.
}

// --- NEW/FIXED TYPES ---

export interface VerificationIssue {
    title: string;
    description: string;
}

// Added for the new consistency check feature
export interface VerificationResult {
    is_consistent: boolean;
    reasoning: string;
}

export interface DisciplineImpact {
    discipline: string;
    mentions: number;
    description: string;
}

export interface BidDateChange {
    is_changed: boolean;
    details: string;
}


export interface TriageReportData {
    summary: string;
    bid_date_change: BidDateChange;
    mentioned_spec_sections: string[];
    mentioned_drawings: string[];
    discipline_impact: DisciplineImpact[];
    suggested_checklist: string[];
    high_impact_changes_count?: number; // V4.0
    has_drawing_changes: boolean; // V4.1
    has_spec_changes: boolean; // V4.1
    questions_and_answers: QAndAItem[]; // V4.1
}

export interface AITriageResult {
    report: TriageReportData;
}

// V3.8: Types for Cost Impact Analysis
export enum CostImpactLevel {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
    NEGLIGIBLE = 'NEGLIGIBLE',
    INFORMATIONAL = 'INFORMATIONAL'
}

export interface CostImpactItem {
    change_id: number;
    cost_impact: CostImpactLevel;
    rationale: string;
}

export interface AICostAnalysisResult {
    overall_impact_summary: string;
    cost_impact_items: CostImpactItem[];
}


export interface ClickableArea {
    x: number;
    y: number;
    width: number;
    height: number;
    changeId: number;
}

export interface ConformedPageInfo {
    map: PageMapItem;
    conformedPageNumber: number;
    approvedTextChanges: AppChangeLogItem[];
}

export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// This is the shape we'll use in the app's state for the UI change list.
// It's a unified list synthesized from the AI's ConformingPlan.
export interface AppChangeLogItem {
  id: number;
  status: ChangeStatus;
  addendum_name: string;
  change_type: ChangeType;
  source_original_document: 'drawings' | 'specs'; // V3.7
  
  // V2.5: The primary user-facing description. Editable.
  description: string; 

  // Location details, also editable.
  location_hint?: string;
  spec_section?: string;
  discipline?: string;
  
  // V5.1: The query used for robust semantic mapping.
  semantic_search_query?: string;

  // Text change specific
  exact_text_to_find?: string;
  new_text_to_insert?: string;

  // Page change specific
  target_page_number?: number; // Original page to affect for DELETE/REPLACE
  insert_after_original_page_number?: number; // for ADD

  // Common location info
  source_page: number; // Addendum page for ADD/REPLACE/TEXT, or 0 for DELETE
  original_page_number?: number; // Original page for TEXT changes
  
  // App-specific
  isManual?: boolean;
}

// Represents a file stored in Supabase Storage. This is the persistent state.
export interface ProjectFile {
    name: string;
    type: string;
    size: number;
    path: string; // The path in Supabase storage
}

export interface AppError {
    title: string;
    message: string;
}

export type MonitoringStatus = 'idle' | 'checking' | 'found' | 'error';

export interface AppState {
    projectId: string; // This is the UUID from the Supabase table
    phase: AppPhase;
    appError: AppError | null;
    currentUser: User | null; // This will be set from Supabase session
    
    // Files are now represented by their metadata, including storage path.
    baseDrawings: ProjectFile | null; 
    baseSpecs: ProjectFile | null;
    addenda: ProjectFile[];
    
    projectName: string | null;
    lastModified: number | null;
    
    changeLog: AppChangeLogItem[];
    qaLog: QAndAItem[]; // V6.0: For extracted Q&A items
    drawingsConformingPlan: ConformingPlan | null;
    specsConformingPlan: ConformingPlan | null;
    baseDrawingsPageCount: number;
    baseSpecsPageCount: number;
    triageReport: TriageReportData | null;
    activeDocumentTitle: string;
    executiveSummary: string | null;
    summaryError: string | null;
    costAnalysisResult: AICostAnalysisResult | null;
    costAnalysisError: string | null;
    
    // V7.0: Addenda Monitoring
    monitoringUrl?: string;
    lastChecked?: number | null;
    monitoringStatus?: MonitoringStatus;
}