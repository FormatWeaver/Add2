
import { GoogleGenAI, Type, GenerateContentResponse, Part, Content } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { ChangeType, AIConformingPlan, AppChangeLogItem, ConformingPlan, AITriageResult, AICostAnalysisResult, CostImpactLevel, ConformedPageInfo, VerificationResult, QAndAItem, RiskLevel } from '../types';

// Use Pro for heavy-duty reasoning, Flash for lightweight tasks
const HEAVY_MODEL = 'gemini-3-pro-preview';
const LIGHT_MODEL = 'gemini-3-flash-preview';

const getApiErrorMessage = (error: any): string => {
    if (typeof error?.message !== 'string') return 'An unknown API error occurred.';
    try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error?.message) return parsedError.error.message;
    } catch (e) {}
    if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) return 'Quota exceeded.';
    return error.message;
};

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: base64Data, mimeType: file.type || 'application/pdf' } };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createFullTextManifest = async (file: File | null, docType: string): Promise<string> => {
    if (!file) return `No ${docType} document provided.`;
    let doc: pdfjsLib.PDFDocumentProxy | undefined;
    try {
        doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const manifestParts: string[] = [`The ${docType} document "${file.name}" has ${doc.numPages} pages.`];
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            manifestParts.push(`--- Page ${i} ---\n${textContent.items.map((item: any) => item.str).join(' ').substring(0, 300).trim()}`);
            page.cleanup();
        }
        return manifestParts.join('\n\n');
    } finally { doc?.destroy(); }
};

const createConciseManifest = async (file: File, docType: string): Promise<string> => {
    let doc: pdfjsLib.PDFDocumentProxy | undefined;
    try {
        doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const manifestParts: string[] = [`--- Document: "${file.name}" (${docType}, ${doc.numPages} pages) ---`];
        for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            manifestParts.push(`Page ${i} Snippet:\n${textContent.items.map((item: any) => item.str).join(' ').substring(0, 500).trim()}`);
            page.cleanup();
        }
        return manifestParts.join('\n\n');
    } finally { doc?.destroy(); }
};

export const verifyDocumentConsistency = async (files: (File | null)[], contextQuestion: string): Promise<VerificationResult> => {
    try {
        const validFiles = files.filter((f): f is File => f !== null);
        if (validFiles.length < 2) return { is_consistent: true, reasoning: "Not enough documents." };
        const manifests = await Promise.all(validFiles.map(f => createConciseManifest(f, 'document')));
        const prompt = `expert construction manager. Question: **${contextQuestion}**. Manifests: ${manifests.join('\n\n')}. Return JSON {is_consistent: boolean, reasoning: string}.`;
        const response = await ai.models.generateContent({
            model: LIGHT_MODEL,
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { is_consistent: { type: Type.BOOLEAN }, reasoning: { type: Type.STRING } }, required: ['is_consistent', 'reasoning'] } }
        });
        return JSON.parse(response.text) as VerificationResult;
    } catch (error) { return { is_consistent: true, reasoning: "Error checking consistency." }; }
};

export const generateConformingPlan = async (addendaFiles: File[], baseDrawingsFile: File | null, baseSpecsFile: File | null, customDirectives?: string): Promise<{ plan: AIConformingPlan }> => {
    try {
        const [specsManifest, drawingsManifest] = await Promise.all([
            createFullTextManifest(baseSpecsFile, 'specifications'),
            createFullTextManifest(baseDrawingsFile, 'drawings')
        ]);
        const addendaParts = await Promise.all(addendaFiles.map(async f => ([{ text: `File Content for ${f.name}:` }, await fileToGenerativePart(f)] as Part[])));
        
        const prompt = `
You are a World-Class Construction Risk Manager and Senior Estimator. 
Your task is to EXHAUSTIVELY identify every single instruction in the provided addenda that changes the original project documents.

**SPECIAL PROJECT DIRECTIVES**:
${customDirectives ? `CRITICAL FOCUS: ${customDirectives}` : "Follow standard professional estimating best practices."}

**CORE DIRECTIVE**:
Surgically extract change instructions. You must find:
- Text deletions, replacements, and additions.
- Drawing sheet replacements, additions, or deletions.
- General project notes that affect the overall scope.

**RISK ANALYSIS REQUIRED**:
1. Assign a \`risk_score\` (CRITICAL, HIGH, MEDIUM, LOW, INFO). 
   - CRITICAL: Major scope additions, liquidated damage changes, safety spec deletions.
   - HIGH: New mechanical/electrical equipment specs, structural changes, floor plan revisions.
2. Provide a detailed \`risk_rationale\`.
3. For vague instructions, provide a \`suggested_rfi_draft\`.

**BLUEPRINT CONTEXT**:
- Original Specs Index: ${specsManifest}
- Original Drawings Index: ${drawingsManifest}

Analyze the attached addenda files meticulously. Do not hallucinate. If an instruction refers to a page that doesn't seem to exist in the manifest, still capture the instruction but note the ambiguity in the risk rationale.
`;
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                change_instructions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            change_id: { type: Type.STRING },
                            change_type: { type: Type.STRING, enum: Object.values(ChangeType) },
                            human_readable_description: { type: Type.STRING },
                            source_addendum_file: { type: Type.STRING },
                            search_target: { type: Type.OBJECT, properties: { document_type: { type: Type.STRING, enum: ['drawings', 'specs'] }, semantic_search_query: { type: Type.STRING }, location_hint: { type: Type.STRING } }, required: ["document_type", "semantic_search_query"] },
                            data_payload: { type: Type.OBJECT, properties: { text_to_find: { type: Type.STRING }, replacement_text: { type: Type.STRING }, source_page_in_addendum: { type: Type.INTEGER }, original_page_number_to_affect: { type: Type.INTEGER }, addendum_source_page_number: { type: Type.INTEGER }, insert_after_original_page_number: { type: Type.INTEGER } } },
                            ai_confidence_score: { type: Type.NUMBER },
                            discipline: { type: Type.STRING },
                            spec_section: { type: Type.STRING },
                            risk_score: { type: Type.STRING, enum: Object.values(RiskLevel) },
                            risk_rationale: { type: Type.STRING },
                            suggested_rfi_draft: { type: Type.STRING },
                        },
                        required: ["change_id", "change_type", "human_readable_description", "source_addendum_file", "search_target", "data_payload", "ai_confidence_score", "risk_score"]
                    }
                },
                questions_and_answers: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, source_addendum_file: { type: Type.STRING }, discipline: { type: Type.STRING }, spec_section: { type: Type.STRING } }, required: ["question", "answer", "source_addendum_file"] } }
            }
        };

        const response = await ai.models.generateContent({
            model: HEAVY_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }, ...addendaParts.flat()] }],
            config: { 
              responseMimeType: 'application/json', 
              responseSchema,
              thinkingConfig: { thinkingBudget: 4000 } // Allocate thinking budget for complex analysis
            },
        });
        return { plan: JSON.parse(response.text) as AIConformingPlan };
    } catch (error) { throw new Error(`Failed to conform: ${getApiErrorMessage(error)}`); }
};

export const generateTriageReport = async (addendaFiles: File[]): Promise<AITriageResult> => {
    try {
        const addendaParts = await Promise.all(addendaFiles.map(async f => ([{ text: `File: ${f.name}` }, await fileToGenerativePart(f)] as Part[])));
        const prompt = "Expert construction estimator. Perform an initial triage of these addenda. Provide a summary of high-level scope impacts, bid date changes, impacted disciplines, a required actions checklist, and key Q&A. Use your reasoning capabilities to identify potential landmines for the bidding team.";
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                report: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        overall_risk_score: { type: Type.STRING, enum: Object.values(RiskLevel) },
                        bid_date_change: { type: Type.OBJECT, properties: { is_changed: { type: Type.BOOLEAN }, details: { type: Type.STRING } }, required: ["is_changed", "details"] },
                        mentioned_spec_sections: { type: Type.ARRAY, items: { type: Type.STRING } },
                        mentioned_drawings: { type: Type.ARRAY, items: { type: Type.STRING } },
                        discipline_impact: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { discipline: { type: Type.STRING }, mentions: { type: Type.INTEGER }, description: { type: Type.STRING } }, required: ["discipline", "mentions", "description"] } },
                        suggested_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                        high_impact_changes_count: { type: Type.INTEGER },
                        has_drawing_changes: { type: Type.BOOLEAN },
                        has_spec_changes: { type: Type.BOOLEAN },
                        questions_and_answers: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, answer: { type: Type.STRING }, impact_summary: { type: Type.STRING } }, required: ["question", "answer", "impact_summary"] } }
                    },
                    required: ["summary", "overall_risk_score", "bid_date_change", "discipline_impact", "suggested_checklist", "questions_and_answers"]
                }
            }
        };
        const response = await ai.models.generateContent({
            model: HEAVY_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }, ...addendaParts.flat()] }],
            config: { 
              responseMimeType: 'application/json', 
              responseSchema,
              thinkingConfig: { thinkingBudget: 2000 }
            },
        });
        return JSON.parse(response.text) as AITriageResult;
    } catch (error) { throw new Error(`Triage failed: ${getApiErrorMessage(error)}`); }
};

export const generateExecutiveSummary = async (changeLog: AppChangeLogItem[]): Promise<string> => {
    try {
        const approved = changeLog.filter(c => c.status === 'APPROVED');
        if (approved.length === 0) return "No changes approved.";
        const prompt = `Summarize these construction document changes for a Project Director. Use 3-5 high-impact professional bullets. Focus on scope changes, financial risks (HIGH or CRITICAL), and timeline implications:\n${approved.map(c => `- [${c.risk_level}] ${c.description}`).join('\n')}`;
        const response = await ai.models.generateContent({ model: LIGHT_MODEL, contents: prompt });
        return response.text;
    } catch (error) { throw new Error(`Summary failed: ${getApiErrorMessage(error)}`); }
};

export const generateCostImpactAnalysis = async (approvedChanges: AppChangeLogItem[]): Promise<AICostAnalysisResult> => {
    try {
        const changesAsText = JSON.stringify(approvedChanges.map(c => ({ id: c.id, description: c.description, type: c.change_type, risk: c.risk_level })), null, 2);
        const prompt = `Analyze these approved construction changes for potential cost impact. Categorize each based on likely magnitude (HIGH, MEDIUM, LOW, etc.). Provide a rationale for each assessment based on typical construction unit rates and scope complexity.\n\nChanges:\n${changesAsText}`;
        const responseSchema = {
            type: Type.OBJECT,
            properties: { overall_impact_summary: { type: Type.STRING }, cost_impact_items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { change_id: { type: Type.INTEGER }, cost_impact: { type: Type.STRING, enum: Object.values(CostImpactLevel) }, rationale: { type: Type.STRING } }, required: ["change_id", "cost_impact", "rationale"] } } },
            required: ["overall_impact_summary", "cost_impact_items"]
        };
        const response = await ai.models.generateContent({ 
          model: HEAVY_MODEL, 
          contents: prompt, 
          config: { responseMimeType: 'application/json', responseSchema } 
        });
        return JSON.parse(response.text) as AICostAnalysisResult;
    } catch (error) { throw new Error(`Cost analysis failed: ${getApiErrorMessage(error)}`); }
};

export const generateSingleRFIDraft = async (change: AppChangeLogItem): Promise<string> => {
    try {
        const prompt = `
Expert construction project engineer. Draft a formal RFI for the following change instruction found in an addendum.
The RFI should be professional, concise, and highlight why clarification is needed based on the risk level provided.

CHANGE DESCRIPTION: ${change.description}
LOCATION: ${change.spec_section || 'Sheet'} ${change.location_hint || 'N/A'}
RISK LEVEL: ${change.risk_level}
RISK RATIONALE: ${change.risk_rationale || 'N/A'}

Respond with ONLY the draft RFI text. No preamble.
`;
        const response = await ai.models.generateContent({ model: LIGHT_MODEL, contents: prompt });
        return response.text || "Failed to generate draft. Please try again.";
    } catch (error) { throw new Error(`RFI Generation failed: ${getApiErrorMessage(error)}`); }
};

export const checkUrlForNewAddenda = async (url: string, existingAddendaNames: string[]): Promise<{ found: boolean, details: string }> => {
    try {
        const prompt = `
Expert construction estimator. Browse this project bidding site: ${url}
Check if there are any new addenda or project files listed that are NOT in this set: ${existingAddendaNames.join(', ')}.
Look for phrases like "Addendum #4", "Revision 2", "Closing Date Extended", etc.
If you find something NEW, respond with JSON { "found": true, "details": "Found Addendum #X issued on date Y." }.
If nothing new is found, respond with { "found": false, "details": "Checked site, no new documents found." }.
Return ONLY the JSON.
`;
        const response = await ai.models.generateContent({
            model: HEAVY_MODEL,
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
            }
        });
        
        // Grounding responses might not be pure JSON, so we attempt to extract it.
        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        const found = text.toLowerCase().includes('found') && !text.toLowerCase().includes('no new');
        return { found, details: text.substring(0, 150) };
    } catch (error) {
        console.error("Monitoring failed:", error);
        return { found: false, details: "Monitoring check failed due to technical error." };
    }
};
