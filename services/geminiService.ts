import { GoogleGenAI, Type, GenerateContentResponse, Part, Content } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { ChangeType, AIConformingPlan, AppChangeLogItem, ConformingPlan, AITriageResult, AICostAnalysisResult, CostImpactLevel, ConformedPageInfo, VerificationResult, QAndAItem } from '../types';

// Define the primary model for all generative tasks.
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Parses a potential Gemini API error to extract a user-friendly message.
 * It handles cases where the error message is a JSON string.
 * @param error The error object caught in a catch block.
 * @returns A clean, human-readable error string.
 */
const getApiErrorMessage = (error: any): string => {
    if (typeof error?.message !== 'string') {
        return 'An unknown API error occurred.';
    }

    // Check if the message is a JSON string from the API
    try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error?.message) {
            // Return the specific message from the API error object
            return parsedError.error.message;
        }
    } catch (e) {
        // Not a JSON string, fall through to check for keywords.
    }

    // Fallback for non-JSON quota messages
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
 * This provides the AI with a detailed blueprint for content-aware analysis.
 * @param file The PDF file to process.
 * @param docType A string descriptor ('specifications' or 'drawings').
 * @returns A string containing the full text manifest.
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
                // Create a text snippet from the page content.
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
 * This is a lighter alternative to createFullTextManifest for quick verification tasks.
 * @param file The PDF file to process.
 * @param docType A string descriptor ('specifications', 'drawings', 'addendum').
 * @returns A string containing a concise manifest of the document.
 */
const createConciseManifest = async (file: File, docType: string): Promise<string> => {
    if (!file) return `No ${docType} document provided.`;

    let doc: pdfjsLib.PDFDocumentProxy | undefined;
    try {
        doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const pageCount = doc.numPages;
        const pagesToSample = Math.min(pageCount, 3); // Sample first 3 pages
        
        const manifestParts: string[] = [];
        manifestParts.push(`--- Document: "${file.name}" (${docType}, ${pageCount} pages) ---`);

        for (let i = 1; i <= pagesToSample; i++) {
            try {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                // Create a text snippet from the page content.
                const pageText = textContent.items.map((item: any) => item.str).join(' ').substring(0, 500); // More text for better context
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
            // Not enough documents to compare
            return { is_consistent: true, reasoning: "Not enough documents to perform a consistency check." };
        }

        const manifests: string[] = [];
        for (const file of validFiles) {
            // Determine a simple docType from the name
            let docType = 'document';
            if (file.name.toLowerCase().includes('spec')) docType = 'specification';
            else if (file.name.toLowerCase().includes('drawing') || file.name.toLowerCase().includes('sheet')) docType = 'drawing set';
            else if (file.name.toLowerCase().includes('addendum')) docType = 'addendum';
            
            manifests.push(await createConciseManifest(file, docType));
        }

        const prompt = `
You are an expert construction project manager. Your task is to perform a consistency check on the provided document manifests.
The core question to answer is: **${contextQuestion}**

Based on the manifests, analyze for consistency in project names, project numbers, addresses, architects, key personnel, and overall scope.

**DOCUMENT MANIFESTS:**
${manifests.join('\n\n---\n\n')}

**YOUR TASK:**
Return a single JSON object with two fields:
1.  \`is_consistent\`: A boolean (\`true\` if the documents seem to belong together, \`false\` if there are significant, undeniable discrepancies). Err on the side of \`true\` for minor differences like typos.
2.  \`reasoning\`: A brief, one-sentence explanation for your decision. If not consistent, clearly state the primary discrepancy found (e.g., "Project numbers '1234' and '5678' do not match.").
`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                is_consistent: { 
                    type: Type.BOOLEAN, 
                    description: "True if the documents are consistent, false if there are major discrepancies." 
                },
                reasoning: { 
                    type: Type.STRING, 
                    description: "A one-sentence explanation for the decision."
                },
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
        throw new Error(`Failed to verify document consistency: ${getApiErrorMessage(error)}`);
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
You are an expert construction project manager. Your goal is to identify every single change instruction in the provided addenda. For each instruction, you must generate a JSON object with the following fields:

1.  **change_id**: A unique string identifier (e.g., "c1", "c2").
2.  **change_type**: Classify the change (e.g., "PAGE_REPLACE", "TEXT_REPLACE", "PAGE_ADD").
3.  **human_readable_description**: A clear, concise summary of the change instruction.
4.  **source_addendum_file**: The filename of the addendum where the instruction was found.
5.  **search_target**: An object containing:
    *   **document_type**: Either "specs" or "drawings".
    *   **semantic_search_query**: A concise search query that is likely to find the location in the original document. This is the most important field for mapping. For example: "Section 08 80 00 Glazing general requirements" or "Detail 5 on sheet A-502". Do not wrap this in quotes in the output.
    *   **location_hint**: A secondary hint, like a spec section number ("08 80 00") or a sheet number ("A-101").
6.  **data_payload**: An object containing the specific data for the change:
    *   For text changes: \`text_to_find\`, \`replacement_text\`, \`source_page_in_addendum\`.
    *   For page changes: \`original_page_number_to_affect\`, \`addendum_source_page_number\`, \`insert_after_original_page_number\`.
7.  **ai_confidence_score**: Your confidence (0.0 to 1.0) in the accuracy of the extracted instruction.
8.  **discipline**: (e.g., "Architectural", "Structural", "MEP").
9.  **spec_section**: (e.g., "08 80 00").

**ADDITIONAL TASK: IDENTIFY QUESTIONS & ANSWERS**
Many addenda contain Clarifications or Questions and Answers (Q&A). If you find such sections, you MUST extract each question and its corresponding answer. For each Q&A pair, create a JSON object and add it to a separate list called \`questions_and_answers\` in the final output. The Q&A object must contain: \`question\`, \`answer\`, \`source_addendum_file\`, \`discipline\`, and \`spec_section\` if identifiable.

**CRITICAL INSTRUCTION FOR PAGE REPLACEMENTS:**
When you identify a \`PAGE_REPLACE\` change, you MUST determine the correct original page to replace. Do this by analyzing the content of the new page provided in the addendum and finding the page in the original document's full text manifest that is the most logical, content-similar match (i.e., the previous version of that sheet). For example, if the new page contains a title block for 'A-101 - FLOOR PLAN', you must find the original page with the 'A-101 - FLOOR PLAN' title block, not the first mention of 'A-101' in a sheet index. The page number you identify MUST be placed in the \`original_page_number_to_affect\` field in the \`data_payload\`. DO NOT rely on simple sheet number text matching alone; use content similarity. This is mandatory.

**ABSOLUTELY CRITICAL INSTRUCTION ON INSTRUCTIONAL PAGES (MUST BE FOLLOWED):**
Many addenda begin with pages that are purely instructional, such as a cover letter, a transmittal form, a list of included documents, or a page that only contains text like "Please replace the following pages". These pages ARE NOT part of the final conformed document set.

You MUST follow this rule: **DO NOT** create \`PAGE_ADD\` or \`PAGE_REPLACE\` instructions for these types of instructional or transmittal pages. Only create \`PAGE_REPLACE\` or \`PAGE_ADD\` instructions for pages that are clearly new or revised **drawings or specification sections** meant to be part of the final bid set.

You should still read these instructional pages to find other commands (like \`PAGE_DELETE\`), but the instructional page itself must be ignored for \`PAGE_ADD\`/\`PAGE_REPLACE\`. Failure to follow this rule will result in an incorrect final document.

**DOCUMENT BLUEPRINT (FULL TEXT MANIFESTS):**
- **Specifications:** ${specsManifest}
- **Drawings:** ${drawingsManifest}

**INPUT FILES:**
The following are the addenda files that contain the changes. They are provided as inline PDFs.

**YOUR TASK:**
Generate a single JSON object containing a list called \`change_instructions\` and an optional list called \`questions_and_answers\`. Each item in these lists must strictly adhere to the schema described above and the detailed schema provided.
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
                    description: "A list of all change instructions, including both page-level and text-level modifications.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            change_id: { type: Type.STRING, description: "A unique identifier for the change instruction, e.g., 'c1'." },
                            change_type: { type: Type.STRING, enum: Object.values(ChangeType), description: "The type of change." },
                            human_readable_description: { type: Type.STRING, description: "A concise, human-readable summary of the change (e.g., 'Replace Sheet A-101 with the revised version.')." },
                            source_addendum_file: { type: Type.STRING, description: "The filename of the addendum this change came from." },
                            search_target: {
                                type: Type.OBJECT,
                                properties: {
                                    document_type: { type: Type.STRING, enum: ['drawings', 'specs'], description: "Which original document this change applies to." },
                                    semantic_search_query: { type: Type.STRING, description: "A concise search query likely to find the location in the original document. Do not wrap in quotes." },
                                    location_hint: { type: Type.STRING, description: "A hint for locating the change, like a sheet number or nearby unique text." },
                                },
                                required: ["document_type", "semantic_search_query"]
                            },
                            data_payload: {
                                type: Type.OBJECT,
                                properties: {
                                    text_to_find: { type: Type.STRING, description: "For TEXT_REPLACE/TEXT_DELETE, the exact text to be found in the original document." },
                                    replacement_text: { type: Type.STRING, description: "For TEXT_REPLACE/TEXT_ADD, the new text to be inserted." },
                                    source_page_in_addendum: { type: Type.INTEGER, description: "For TEXT changes, the page number in the addendum where the instruction is found." },
                                    original_page_number_to_affect: { type: Type.INTEGER, description: "For PAGE_DELETE/PAGE_REPLACE, the page number in the original document to be affected." },
                                    addendum_source_page_number: { type: Type.INTEGER, description: "For PAGE_ADD/PAGE_REPLACE, the page number from the addendum file to use as the source." },
                                    insert_after_original_page_number: { type: Type.INTEGER, description: "For PAGE_ADD, the page number in the original document after which this new page should be inserted. Use 0 for the beginning." },
                                }
                            },
                            ai_confidence_score: { type: Type.NUMBER, description: "A certainty score from 0 to 1." },
                            discipline: { type: Type.STRING, description: "The construction discipline this change belongs to (e.g., Architectural, Structural, MEP)." },
                            spec_section: { type: Type.STRING, description: "The specification section number (e.g., '08 80 00') if applicable." },
                        },
                        required: ["change_id", "change_type", "human_readable_description", "source_addendum_file", "search_target", "data_payload", "ai_confidence_score"]
                    }
                },
                 questions_and_answers: {
                    type: Type.ARRAY,
                    description: "A list of all Questions and Answers found in the addenda.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING, description: "The full text of the question asked." },
                            answer: { type: Type.STRING, description: "The full text of the answer provided." },
                            source_addendum_file: { type: Type.STRING, description: "The filename of the addendum this Q&A came from." },
                            discipline: { type: Type.STRING, description: "The construction discipline this Q&A relates to (e.g., Architectural)." },
                            spec_section: { type: Type.STRING, description: "The specification section number (e.g., '08 80 00') if applicable." },
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
You are an expert construction estimator. Your task is to perform a triage analysis on the provided addenda files and generate a structured report.

**YOUR TASK:**
Analyze the addenda and produce a JSON object that adheres to the provided schema. Your analysis should cover the following points:
1.  **Summary:** Write a high-level summary (2-3 sentences) of the most significant changes in the addenda.
2.  **Bid Date:** Determine if the bid date has been changed. If so, state the new date and time.
3.  **Impacted Disciplines:** Identify which construction disciplines (e.g., Architectural, Structural, MEP, Civil, Landscape) are most affected and briefly describe why.
4.  **Impacted Documents:** List the names/numbers of any specific drawing sheets or spec sections mentioned.
5.  **Checklist:** Create a short checklist of critical actions an estimator should take based on these addenda (e.g., "Get updated pricing from steel supplier," "Inform electrical sub of new fixture schedule").
6.  **Q&A:** Formulate 3-5 important questions an estimator might ask after reading this addendum, provide a direct answer based on the text, and summarize the potential impact.
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
                        summary: { type: Type.STRING, description: "High-level summary of changes." },
                        bid_date_change: {
                            type: Type.OBJECT,
                            properties: {
                                is_changed: { type: Type.BOOLEAN },
                                details: { type: Type.STRING, description: "e.g., 'No change' or 'New date: July 5, 2024 at 2:00 PM'." }
                            },
                            required: ["is_changed", "details"]
                        },
                        mentioned_spec_sections: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of spec section numbers mentioned (e.g., '08 80 00')." },
                        mentioned_drawings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of drawing sheet numbers mentioned (e.g., 'A-101', 'S-502')." },
                        discipline_impact: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    discipline: { type: Type.STRING },
                                    mentions: { type: Type.INTEGER, description: "Number of changes related to this discipline." },
                                    description: { type: Type.STRING, description: "Brief summary of the impact." }
                                },
                                required: ["discipline", "mentions", "description"]
                            }
                        },
                        suggested_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                        high_impact_changes_count: { type: Type.INTEGER, description: "An estimated count of changes that are likely to have a high cost impact." },
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
        if (changeLog.length === 0) {
            return "No changes were identified in the provided documents.";
        }

        const changeDescriptions = changeLog
            .filter(c => c.status === 'APPROVED')
            .map(c => `- ${c.description}`)
            .join('\n');

        const prompt = `
You are an AI assistant for construction project managers. I have a list of approved changes from an addendum.
Please write a concise executive summary (3-5 bullet points) of these changes.
Focus on the most impactful items. Start each bullet point with a '*'. Do not write a title or introduction.

**CHANGES:**
${changeDescriptions}
`;

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error generating executive summary:", error);
        throw new Error(`Failed to generate executive summary: ${getApiErrorMessage(error)}`);
    }
};

export const generateCostImpactAnalysis = async (approvedChanges: AppChangeLogItem[]): Promise<AICostAnalysisResult> => {
    try {
        if (approvedChanges.length === 0) {
            throw new Error("No approved changes to analyze for cost impact.");
        }

        const changesAsText = JSON.stringify(approvedChanges.map(c => ({
            id: c.id,
            description: c.description,
            type: c.change_type,
            details: c.new_text_to_insert || `Deleted: ${c.exact_text_to_find || 'page'}`
        })), null, 2);

        const prompt = `
You are an AI cost estimator for a construction company.
Analyze the following list of project changes and provide a cost impact analysis.
For each change, determine its potential cost impact level (HIGH, MEDIUM, LOW, NEGLIGIBLE, INFORMATIONAL) and provide a brief rationale.
Finally, write a brief, high-level summary of the overall cost impact.

**CHANGES TO ANALYZE:**
${changesAsText}

**YOUR TASK:**
Return a JSON object matching the provided schema.
- 'HIGH' impact means a significant change in cost (>5% of a trade's scope).
- 'MEDIUM' impact is a notable but manageable cost change.
- 'LOW' impact has minor cost implications.
- 'NEGLIGIBLE' means cost change is minimal, likely absorbed in overhead.
- 'INFORMATIONAL' means the change has no direct cost impact (e.g., correcting a typo).
`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                overall_impact_summary: {
                    type: Type.STRING,
                    description: "A brief, high-level summary of the overall cost impact of all changes combined."
                },
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
            config: {
                responseMimeType: 'application/json',
                responseSchema,
            },
        });

        const result = JSON.parse(response.text) as AICostAnalysisResult;
        return result;

    } catch (error) {
        console.error("Error generating cost impact analysis:", error);
        throw new Error(`Failed to generate cost impact analysis: ${getApiErrorMessage(error)}`);
    }
};

/**
 * [PLANNED FEATURE - SIMULATED]
 * Checks a public bidding URL for new addenda using Gemini with Google Search grounding.
 * This function would be implemented in a secure backend (e.g., Supabase Edge Function).
 * @param url The URL of the public bidding site.
 * @param lastChecked The timestamp of the last check.
 * @returns A promise that resolves to true if a new addendum is found.
 */
export const checkForNewAddenda = async (url: string, lastChecked: number | null): Promise<boolean> => {
    console.log(`[BLUEPRINT] This function is a placeholder for a backend implementation. It would check ${url} for new addenda since ${lastChecked ? new Date(lastChecked).toISOString() : 'the beginning'}.`);
    
    // In a real implementation:
    // 1. A Supabase Edge Function would be triggered on a schedule.
    // 2. It would fetch the content of the URL.
    // 3. It would send the content to Gemini with a prompt asking to identify new documents posted after `lastChecked`.
    //    Example prompt: "Analyze the following HTML content from a bidding website. Based on the text, has a new addendum document been posted since ${new Date(lastChecked).toISOString()}? Look for phrases like 'Addendum #5 posted', dates, and new file links. Respond with a single JSON object: { 'newAddendumFound': boolean, 'reasoning': string }."
    // 4. Enable `tools: [{googleSearch: {}}]` for up-to-date information if not passing HTML content directly.
    // 5. Parse the AI's boolean response and update the project's status in the database.
    
    // This frontend simulation will always return false as the logic belongs on the backend.
    return false;
};