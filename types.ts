
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    jobTitle?: string;
    company?: string;
    location?: string;
    bio?: string;
    role?: 'admin' | 'user';
    efficiencyScore?: number;
    platformRank?: string;
}

export enum Page {
  LANDING,
  APP,
  HOW_IT_WORKS,
  PRICING,
  LOGIN,
  DASHBOARD,
  ADMIN_PORTAL,
}

export enum AppPhase {
  PROJECT_SETUP,
  VERIFYING_CONSISTENCY,
  INDEXING_IN_PROGRESS,
  INDEXING_FAILED,
  ADDENDA_UPLOAD,
  ANALYZING_ADDENDUM,
  MAPPING_CHANGES,
  ANALYSIS_FAILED,
  RESULTS,
}

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

export enum RiskLevel {
    CRITICAL = "CRITICAL",
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW",
    INFO = "INFO"
}

export interface PageMapItem {
    conformed_page_number: number;
    source_document: 'original' | 'addendum';
    source_page_number: number;
    reason: string;
    original_page_for_comparison?: number;
    insert_after_original_page_number?: number;
    addendum_name?: string;
    original_document_type?: 'drawings' | 'specs';
}

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
        text_to_find?: string;
        replacement_text?: string;
        source_page_in_addendum?: number;
        original_page_number_to_affect?: number;
        addendum_source_page_number?: number;
        insert_after_original_page_number?: number;
    };
    ai_confidence_score: number;
    discipline?: string;
    spec_section?: string;
    risk_score?: RiskLevel;
    risk_rationale?: string;
    suggested_rfi_draft?: string;
}

export interface QAndAItem {
    id?: number; 
    question: string;
    answer: string;
    impact_summary?: string;
    source_addendum_file?: string;
    discipline?: string;
    spec_section?: string;
}

export interface AIConformingPlan {
    change_instructions: ChangeInstruction[];
    questions_and_answers?: QAndAItem[];
}

export interface ConformingPlan {
    page_map: PageMapItem[];
    text_changes: AppChangeLogItem[];
}

export interface VerificationIssue {
    title: string;
    description: string;
}

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
    high_impact_changes_count?: number;
    has_drawing_changes: boolean;
    has_spec_changes: boolean;
    questions_and_answers: QAndAItem[];
    overall_risk_score: RiskLevel;
}

export interface AITriageResult {
    report: TriageReportData;
}

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

export interface AuditEntry {
    timestamp: number;
    userId: string;
    userName: string;
    action: 'APPROVED' | 'REJECTED' | 'RESET' | 'EDITED';
}

export interface AppChangeLogItem {
  id: number;
  status: ChangeStatus;
  addendum_name: string;
  change_type: ChangeType;
  source_original_document: 'drawings' | 'specs';
  description: string; 
  location_hint?: string;
  spec_section?: string;
  discipline?: string;
  semantic_search_query?: string;
  exact_text_to_find?: string;
  new_text_to_insert?: string;
  target_page_number?: number;
  insert_after_original_page_number?: number;
  source_page: number;
  original_page_number?: number;
  isManual?: boolean;
  
  // Enterprise Features
  risk_level: RiskLevel;
  risk_rationale?: string;
  suggested_rfi?: string;
  audit_trail: AuditEntry[];
  
  // Deadline Tracking
  due_date?: number; // Timestamp
}

// Added missing interface: ConformedPageInfo
export interface ConformedPageInfo {
    map: PageMapItem;
    conformedPageNumber: number;
    approvedTextChanges: AppChangeLogItem[];
}

// Added missing interface: SelectionRect
export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Added missing interface: ClickableArea
export interface ClickableArea {
    x: number;
    y: number;
    width: number;
    height: number;
    changeId: number;
}

export interface ProjectFile {
    name: string;
    type: string;
    size: number;
    path: string;
}

export interface AppError {
    title: string;
    message: string;
}

export type MonitoringStatus = 'idle' | 'checking' | 'found' | 'error';

export interface AppState {
    projectId: string;
    phase: AppPhase;
    appError: AppError | null;
    currentUser: User | null;
    baseDrawings: ProjectFile | null; 
    baseSpecs: ProjectFile | null;
    addenda: ProjectFile[];
    projectName: string | null;
    lastModified: number | null;
    changeLog: AppChangeLogItem[];
    qaLog: QAndAItem[];
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
    monitoringUrl?: string;
    lastChecked?: number | null;
    monitoringStatus?: MonitoringStatus;
}
