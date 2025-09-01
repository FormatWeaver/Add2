
import * as pdfjsLib from 'pdfjs-dist';
import { AppChangeLogItem } from '../types';

/**
 * Normalizes text for general-purpose reliable matching by removing extra whitespace and converting to lowercase.
 * @param text The input string.
 * @returns The normalized string.
 */
const normalizeText = (text: string | undefined | null): string => {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
};

/**
 * Normalizes a sheet number for robust matching.
 * Converts to lowercase and removes all non-alphanumeric characters.
 * e.g., "Drawing: A-101 R1" becomes "drawinga101r1"
 */
const normalizeSheetNumber = (text: string | undefined | null): string => {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};


/**
 * V5.1: This service now uses the `semantic_search_query` provided by the AI for a more
 * robust and intelligent mapping process, simulating a backend vector search.
 * It pre-scans the document to build a text index, then iterates through unmapped
 * changes, searching the index using the high-quality semantic query first.
 */
export async function mapChangesToPages(
  changeLog: AppChangeLogItem[],
  baseDrawings: File | null,
  baseSpecs: File | null
): Promise<AppChangeLogItem[]> {
  const enrichedChangeLog: AppChangeLogItem[] = JSON.parse(JSON.stringify(changeLog));
  
  if (!baseDrawings && !baseSpecs) {
    console.error("No base documents are available for mapping.");
    return enrichedChangeLog;
  }
  
  const mapDocument = async (docType: 'drawings' | 'specs', documentFile: File | null) => {
    if (!documentFile) return;

    // Identify changes for this document type that need mapping.
    const unmappedChanges = new Set(enrichedChangeLog.filter(c =>
        c.source_original_document === docType && 
        ((c.change_type.startsWith('PAGE_') && !c.target_page_number) || (c.change_type.startsWith('TEXT_') && !c.original_page_number))
    ));
    
    if (unmappedChanges.size === 0) return; // No unmapped changes for this doc type.

    console.log(`Starting robust mapping for ${unmappedChanges.size} changes in ${docType}...`);

    let pdf: pdfjsLib.PDFDocumentProxy | undefined;
    try {
        pdf = await pdfjsLib.getDocument(await documentFile.arrayBuffer()).promise;
        
        // 1. Pre-process all pages to create a searchable index and detect sheet indexes.
        const pageTextContents: { normalizedText: string, normalizedSheetText: string, isLikelyIndex: boolean }[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');

            // Heuristic: If a page contains more than 10 distinct sheet-like identifiers (e.g., A-101, S-502),
            // it's probably a sheet index/table of contents.
            const sheetIdentifierRegex = /[A-Z]{1,3}[-.\s]?[0-9]{1,3}(\.[0-9]{1,2})?/gi;
            const matches = pageText.match(sheetIdentifierRegex);
            const uniqueMatches = matches ? new Set(matches.map(m => normalizeSheetNumber(m))) : new Set();

            pageTextContents.push({
                normalizedText: normalizeText(pageText),
                normalizedSheetText: normalizeSheetNumber(pageText),
                isLikelyIndex: uniqueMatches.size > 10
            });
            page.cleanup();
        }
        
        // 2. Iterate through each unmapped change and scan the document index for it.
        for (const change of Array.from(unmappedChanges)) {
            let changeMapped = false;

            // Use a specific order of search terms for higher accuracy.
            const searchTerms: string[] = [
                change.semantic_search_query, // Highest priority
                change.location_hint,
                change.spec_section,
                change.exact_text_to_find, // Lowest priority for location
            ].filter((t): t is string => !!t);

            const uniqueTerms = [...new Set(searchTerms)];

            for (const term of uniqueTerms) {
                if (changeMapped) break;

                const isPageChange = change.change_type.startsWith('PAGE_');
                const foundPages: number[] = [];
                const normalizedTerm = isPageChange ? normalizeSheetNumber(term) : normalizeText(term);

                for (let i = 0; i < pageTextContents.length; i++) {
                    const pageContent = pageTextContents[i];
                    const contentToSearch = isPageChange ? pageContent.normalizedSheetText : pageContent.normalizedText;

                    if (normalizedTerm && contentToSearch.includes(normalizedTerm)) {
                        foundPages.push(i + 1);
                    }
                }
                
                if (foundPages.length > 0) {
                    let pageToAssign: number;

                    if (isPageChange && foundPages.length > 1) {
                        // NEW HEURISTIC: Filter out pages that are likely sheet indexes.
                        const nonIndexPages = foundPages.filter(pageNum => !pageTextContents[pageNum - 1].isLikelyIndex);
                        
                        if (nonIndexPages.length > 0) {
                            // If we found some plausible non-index pages, use the last of those.
                            pageToAssign = nonIndexPages[nonIndexPages.length - 1];
                        } else {
                            // If all candidates seem to be index pages, fall back to the original heuristic.
                            pageToAssign = foundPages[foundPages.length - 1];
                        }
                    } else {
                        // For text changes or single page matches, use the original heuristic.
                        pageToAssign = isPageChange ? foundPages[foundPages.length - 1] : foundPages[0];
                    }
                    
                    const originalChange = enrichedChangeLog.find(item => item.id === change.id);
                    if (originalChange) {
                        if (isPageChange) {
                            originalChange.target_page_number = pageToAssign;
                        } else {
                            originalChange.original_page_number = pageToAssign;
                        }
                    }
                    
                    unmappedChanges.delete(change);
                    changeMapped = true; // Mark as mapped and break from the terms loop.
                }
            }
        }
        
        if (unmappedChanges.size > 0) {
            console.warn(`Could not map ${unmappedChanges.size} changes in ${docType}. This may be because the text or sheet number was not found in the original document.`, Array.from(unmappedChanges));
        }
    } finally {
        pdf?.destroy();
    }
  };

  await mapDocument('specs', baseSpecs);
  await mapDocument('drawings', baseDrawings);

  return enrichedChangeLog;
}
