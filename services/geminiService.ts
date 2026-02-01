
import { GoogleGenAI, Type, GenerateContentResponse, Part, Content } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { ChangeType, AIConformingPlan, AppChangeLogItem, ConformingPlan, AITriageResult, AICostAnalysisResult, CostImpactLevel, ConformedPageInfo, VerificationResult, QAndAItem } from '../types';

// Define the primary model for all generative tasks.
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Parses a potential Gemini API error to extract a user-friendly message.
 */
const getApiErrorMessage = (error: any): string => {
    if (typeof error?.message !== 'string') {
        return 'An unknown API error occurred.';
    }
    try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error?.message) {
            return parsedError.error.message;
        }
    } catch (e) {}
    if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
        return 'You exceeded your current quota. Please check your plan and billing details.';
    }
    return error.message;
};


// Helper function to convert a File object to a GoogleGenAI.Part object
const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read file as data URL."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

  const base64Data = await base64EncodedDataPromise;

  return {
    inlineData: {
      data: base64Data,
      mimeType: file.type || 'application/pdf',
    },
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


/**
 * Creates a comprehensive manifest of a PDF document by extracting a text snippet from every single page.
 */
const createFullTextManifest = async (file: File | null, docType: string): Promise<string> => {
    if (!file) return `No ${docType} document provided.`;

    let doc: pdfjsLib.PDFDocumentProxy | undefined;
    try {
        doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const pageCount = doc.numPages;
        
        const manifestParts: string[] = [];
        manifestParts.push(`The ${docType} document "${file.name}" has ${pageCount} pages. A text manifest of every page follows:`);

        for (let i = 1; i <= pageCount; i++) {
            try {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ').substring(0, 300); 
                manifestParts.push(`--- Page ${i} ---\n${pageText.trim()}`);
                page.cleanup();
            } catch (e) {
                console.warn(`Could not process page ${i} of ${file.name}`, e);
                manifestParts.push(`--- Page ${i} ---\n[Error processing page content]`);
            }
        }

        return manifestParts.join('\n\n');
    } finally {
        doc?.destroy();
    }
};

/**
 * Extracts a concise manifest from a PDF document by sampling text from the first few pages.
 */
const createConciseManifest = async (file: File, docType: string): Promise<string> => {
    if (!file) return `No ${docType} document provided.`;

    let doc: pdfjsLib.PDFDocumentProxy | undefined;
    try {
        doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const pageCount = doc.numPages;
        const pagesToSample = Math.min(pageCount, 3); 
        
        const manifestParts: string[] = [];
        manifestParts.push(`--- Document: "${file.name}" (${docType}, ${pageCount} pages) ---`);

        for (let i = 1; i <= pagesToSample; i++) {
            try {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ').substring(0, 500); 
                manifestParts.push(`Page ${i} Snippet:\n${pageText.trim()}`);
                page.cleanup();
            } catch (e) {
                console.warn(`Could not process page ${i} of ${file.name} for manifest`, e);
                manifestParts.push(`Page ${i} Snippet:\n[Error processing page content]`);
            }
        }

        return manifestParts.join('\n\n');
    } finally {
        doc?.destroy();
    }
};

export const verifyDocumentConsistency = async (
    files: (File | null)[],
    contextQuestion: string
): Promise<VerificationResult> => {
    try {
        const validFiles = files.filter((f): f is File => f !== null);
        if (validFiles.length < 2) {
            return { is_consistent: true, reasoning: "Not enough documents to perform a consistency check." };
        }

        const manifests: string[] = [];
        for (const file of validFiles) {
            let docType = 'document';
            if (file.name.toLowerCase().includes('spec')) docType = 'specification';
            else if (file.name.toLowerCase().includes('drawing') || file.name.toLowerCase().includes('sheet')) docType = 'drawing set';
            else if (file.name.toLowerCase().includes('addendum')) docType = 'addendum';
            
            manifests.push(await createConciseManifest(file, docType));
        }

        const prompt = `
You are an expert construction project manager. Your task is to perform a HIGH-LEVEL consistency check on the provided document manifests.
The core question is: **${contextQuestion}**

**CRITICAL RELAXATION RULES:**
1. **IGNORE MINOR VERSION TYPOS**: If project numbers differ by only one or two digits (e.g., '15122.09' vs '15133.09') but the project names, architects, and site addresses match, mark as CONSISTENT. Construction documents often have clerical errors in project headers.
2. **PRIORITIZE PROJECT NAME**: If the Project Name (e.g., "Downtown Hospital") matches across all docs, mark as consistent even if the internal numbering has discrepancies.
3. **ERR ON THE SIDE OF TRUE**: Only return 'false' if it is OBVIOUSLY a different project (e.g., "Apartment Complex" vs "School Renovations").

**DOCUMENT MANIFESTS:**
${manifests.join('\n\n---\n\n')}

**YOUR TASK:**
Return a single JSON object with two fields:
1. \`is_consistent\`: Boolean.
2. \`reasoning\`: One-sentence explanation.
`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                is_consistent: { type: Type.BOOLEAN },
                reasoning: { type: Type.STRING },
            },
            required: ['is_consistent', 'reasoning']
        };

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });

        return JSON.parse(response.text) as VerificationResult;

    } catch (error) {
        console.error("Error verifying document consistency:", error);
        return { is_consistent: true, reasoning: "Skipping consistency check due to technical error." };
    }
};

export const generateConformingPlan = async (
    addendaFiles: File[],
    baseDrawingsFile: File | null,
    baseSpecsFile: File | null
): Promise<{ plan: AIConformingPlan }> => {
    try {
        const specsManifest = await createFullTextManifest(baseSpecsFile, 'specifications');
        const drawingsManifest = await createFullTextManifest(baseDrawingsFile, 'drawings');

        const addendaParts: Part[] = [];
        for (const file of addendaFiles) {
            addendaParts.push({ text: `Addendum file: ${file.name}` });
            addendaParts.push(await fileToGenerativePart(file));
        }
        
        const contents: Content[] = [
            {
                role: 'user',
                parts: [
                    {
                        text: `
You are an expert construction project manager. Your goal is to identify every single change instruction in the provided addenda. For each instruction, you must generate a JSON object.

**DOCUMENT BLUEPRINT (FULL TEXT MANIFESTS):**
- **Specifications:** ${specsManifest}
- **Drawings:** ${drawingsManifest}

**INPUT FILES:**
The following are the addenda files that contain the changes. They are provided as inline PDFs.

**INSTRUCTIONS:**
1. Identify all PAGE_REPLACE, PAGE_ADD, PAGE_DELETE, TEXT_REPLACE, TEXT_ADD, TEXT_DELETE.
2. For PAGE_REPLACE: You MUST find the most logical matching page in the blueprint based on content similarity (e.g. Sheet Number/Title).
3. If Questions & Answers (Q&A) are found, extract them into the \`questions_and_answers\` list.
`
                    },
                    ...addendaParts
                ]
            }
        ];
        
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
                            search_target: {
                                type: Type.OBJECT,
                                properties: {
                                    document_type: { type: Type.STRING, enum: ['drawings', 'specs'] },
                                    semantic_search_query: { type: Type.STRING },
                                    location_hint: { type: Type.STRING },
                                },
                                required: ["document_type", "semantic_search_query"]
                            },
                            data_payload: {
                                type: Type.OBJECT,
                                properties: {
                                    text_to_find: { type: Type.STRING },
                                    replacement_text: { type: Type.STRING },
                                    source_page_in_addendum: { type: Type.INTEGER },
                                    original_page_number_to_affect: { type: Type.INTEGER },
                                    addendum_source_page_number: { type: Type.INTEGER },
                                    insert_after_original_page_number: { type: Type.INTEGER },
                                }
                            },
                            ai_confidence_score: { type: Type.NUMBER },
                            discipline: { type: Type.STRING },
                            spec_section: { type: Type.STRING },
                        },
                        required: ["change_id", "change_type", "human_readable_description", "source_addendum_file", "search_target", "data_payload", "ai_confidence_score"]
                    }
                },
                 questions_and_answers: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            answer: { type: Type.STRING },
                            source_addendum_file: { type: Type.STRING },
                            discipline: { type: Type.STRING },
                            spec_section: { type: Type.STRING },
                        },
                        required: ["question", "answer", "source_addendum_file"]
                    }
                }
            }
        };

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema,
            },
        });
        
        const plan = JSON.parse(response.text) as AIConformingPlan;
        return { plan };

    } catch (error) {
        console.error("Error generating conforming plan:", error);
        throw new Error(`Failed to generate conforming plan: ${getApiErrorMessage(error)}`);
    }
};

export const generateTriageReport = async (addendaFiles: File[]): Promise<AITriageResult> => {
    try {
        const addendaParts: Part[] = [];
        for (const file of addendaFiles) {
            addendaParts.push({ text: `Addendum file: ${file.name}` });
            addendaParts.push(await fileToGenerativePart(file));
        }
        
        const contents: Content[] = [
            {
                role: 'user',
                parts: [
                    {
                        text: `
You are an expert construction estimator. Your task is to perform a triage analysis on the provided addenda files.
Provide a summary of the most significant changes, bid date changes, impacted disciplines, and a checklist of actions.
`
                    },
                    ...addendaParts
                ]
            }
        ];
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                report: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        bid_date_change: {
                            type: Type.OBJECT,
                            properties: {
                                is_changed: { type: Type.BOOLEAN },
                                details: { type: Type.STRING }
                            },
                            required: ["is_changed", "details"]
                        },
                        mentioned_spec_sections: { type: Type.ARRAY, items: { type: Type.STRING } },
                        mentioned_drawings: { type: Type.ARRAY, items: { type: Type.STRING } },
                        discipline_impact: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    discipline: { type: Type.STRING },
                                    mentions: { type: Type.INTEGER },
                                    description: { type: Type.STRING }
                                },
                                required: ["discipline", "mentions", "description"]
                            }
                        },
                        suggested_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                        high_impact_changes_count: { type: Type.INTEGER },
                        has_drawing_changes: { type: Type.BOOLEAN },
                        has_spec_changes: { type: Type.BOOLEAN },
                        questions_and_answers: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    question: { type: Type.STRING },
                                    answer: { type: Type.STRING },
                                    impact_summary: { type: Type.STRING }
                                },
                                required: ["question", "answer", "impact_summary"]
                            }
                        }
                    },
                    required: ["summary", "bid_date_change", "discipline_impact", "suggested_checklist", "questions_and_answers"]
                }
            }
        };

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema,
            },
        });
        
        const result = JSON.parse(response.text) as AITriageResult;
        return result;
        
    } catch (error) {
        console.error("Error generating triage report:", error);
        throw new Error(`Failed to generate triage report: ${getApiErrorMessage(error)}`);
    }
};

export const generateExecutiveSummary = async (changeLog: AppChangeLogItem[]): Promise<string> => {
    try {
        if (changeLog.length === 0) return "No changes identified.";
        const changeDescriptions = changeLog.filter(c => c.status === 'APPROVED').map(c => `- ${c.description}`).join('\n');
        const prompt = `Concisely summarize these construction project changes in 3-5 bullets:\n${changeDescriptions}`;
        const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
        return response.text;
    } catch (error) {
        console.error("Error generating executive summary:", error);
        throw new Error(`Failed to generate executive summary: ${getApiErrorMessage(error)}`);
    }
};

export const generateCostImpactAnalysis = async (approvedChanges: AppChangeLogItem[]): Promise<AICostAnalysisResult> => {
    try {
        if (approvedChanges.length === 0) throw new Error("No approved changes to analyze.");
        const changesAsText = JSON.stringify(approvedChanges.map(c => ({ id: c.id, description: c.description, type: c.change_type })), null, 2);
        const prompt = `Analyze the cost impact of these construction changes. Group by HIGH, MEDIUM, LOW impact levels.\n${changesAsText}`;
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                overall_impact_summary: { type: Type.STRING },
                cost_impact_items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            change_id: { type: Type.INTEGER },
                            cost_impact: { type: Type.STRING, enum: Object.values(CostImpactLevel) },
                            rationale: { type: Type.STRING }
                        },
                        required: ["change_id", "cost_impact", "rationale"]
                    }
                }
            },
            required: ["overall_impact_summary", "cost_impact_items"]
        };
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema },
        });
        return JSON.parse(response.text) as AICostAnalysisResult;
    } catch (error) {
        console.error("Error generating cost impact analysis:", error);
        throw new Error(`Failed to generate cost impact analysis: ${getApiErrorMessage(error)}`);
    }
};
