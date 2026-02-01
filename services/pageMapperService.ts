
import * as pdfjsLib from 'pdfjs-dist';
import { AppChangeLogItem } from '../types';

const normalize = (text: string | undefined | null): string => {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
};

const normalizeStrict = (text: string | undefined | null): string => {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Calculates a match score between a search term and page content.
 * Higher scores indicate better matches.
 */
const calculateMatchScore = (term: string, pageText: string, isPageChange: boolean): number => {
    const normalizedTerm = isPageChange ? normalizeStrict(term) : normalize(term);
    const normalizedPage = isPageChange ? normalizeStrict(pageText) : normalize(pageText);

    if (!normalizedTerm || !normalizedPage) return 0;
    if (normalizedPage === normalizedTerm) return 100; // Perfect match
    
    let score = 0;
    if (normalizedPage.includes(normalizedTerm)) {
        score += 50;
        // Bonus for being at the start of a line or paragraph
        if (normalizedPage.startsWith(normalizedTerm)) score += 20;
        // Density check: how much of the page is this term?
        const density = normalizedTerm.length / normalizedPage.length;
        score += (density * 30);
    }

    return score;
};

export async function mapChangesToPages(
  changeLog: AppChangeLogItem[],
  baseDrawings: File | null,
  baseSpecs: File | null
): Promise<AppChangeLogItem[]> {
  const enrichedChangeLog: AppChangeLogItem[] = JSON.parse(JSON.stringify(changeLog));
  
  if (!baseDrawings && !baseSpecs) return enrichedChangeLog;
  
  const mapDocument = async (docType: 'drawings' | 'specs', documentFile: File | null) => {
    if (!documentFile) return;

    const unmappedChanges = enrichedChangeLog.filter(c =>
        c.source_original_document === docType && 
        ((c.change_type.startsWith('PAGE_') && !c.target_page_number) || (c.change_type.startsWith('TEXT_') && !c.original_page_number))
    );
    
    if (unmappedChanges.length === 0) return;

    let pdf: pdfjsLib.PDFDocumentProxy | undefined;
    try {
        pdf = await pdfjsLib.getDocument(await documentFile.arrayBuffer()).promise;
        
        // Build Index
        const index: { text: string; isIndex: boolean }[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            
            const sheetRegex = /[A-Z]{1,3}[-.\s]?[0-9]{1,3}/gi;
            const matches = pageText.match(sheetRegex);
            index.push({
                text: pageText,
                isIndex: (matches?.length || 0) > 12
            });
            page.cleanup();
        }
        
        for (const change of unmappedChanges) {
            const isPageChange = change.change_type.startsWith('PAGE_');
            const searchTerms = [
                change.semantic_search_query,
                change.location_hint,
                change.spec_section,
                change.exact_text_to_find
            ].filter((t): t is string => !!t);

            let bestPage = -1;
            let highestScore = 0;

            for (let pageNum = 1; pageNum <= index.length; pageNum++) {
                const pageData = index[pageNum - 1];
                let pageScore = 0;

                for (let i = 0; i < searchTerms.length; i++) {
                    const weight = (searchTerms.length - i) / searchTerms.length;
                    const termScore = calculateMatchScore(searchTerms[i], pageData.text, isPageChange);
                    pageScore += (termScore * weight);
                }

                // De-prioritize index/TOC pages for actual content changes
                if (pageData.isIndex && !isPageChange) pageScore *= 0.1;

                if (pageScore > highestScore && pageScore > 15) { // Minimum threshold
                    highestScore = pageScore;
                    bestPage = pageNum;
                }
            }

            if (bestPage !== -1) {
                if (isPageChange) change.target_page_number = bestPage;
                else change.original_page_number = bestPage;
            }
        }
    } finally {
        pdf?.destroy();
    }
  };

  await mapDocument('specs', baseSpecs);
  await mapDocument('drawings', baseDrawings);

  return enrichedChangeLog;
}
