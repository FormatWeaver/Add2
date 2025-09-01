

import { useMemo } from 'react';
import { AppChangeLogItem, ChangeType, ChangeStatus, PageMapItem, ConformedPageInfo } from '../types';

/**
 * V4.0: A custom hook that computes the final, interactive structure of a conformed document
 * from a base page count and the user's approve/reject actions.
 * This hook builds the document from the ground up based on user approvals, ensuring accuracy.
 * @param changeLogForThisDoc - The full list of change items *for this document type only* with their current UI status.
 * @param basePageCount - The total number of pages in the original base document.
 * @param docType - The type of document being conformed ('specs' or 'drawings').
 * @returns An array of ConformedPageInfo objects representing the final, user-vetted document structure.
 */
export const useConformedDocument = (
    changeLogForThisDoc: AppChangeLogItem[],
    basePageCount: number,
    docType: 'specs' | 'drawings'
): ConformedPageInfo[] => {
    return useMemo(() => {
        if (basePageCount === 0 && !changeLogForThisDoc.some(c => c.status === ChangeStatus.APPROVED && c.change_type === ChangeType.PAGE_ADD)) {
            return [];
        }

        const approvedChangeIds = new Set(
            changeLogForThisDoc
                .filter(c => c.status === ChangeStatus.APPROVED)
                .map(c => c.id)
        );
        
        const approvedTextChanges = changeLogForThisDoc.filter(c =>
            approvedChangeIds.has(c.id) && c.change_type.startsWith('TEXT_')
        );

        const pageChanges = changeLogForThisDoc.filter(c => c.change_type.startsWith('PAGE_'));

        const approvedDeletes = new Set(pageChanges
            .filter(c => c.change_type === ChangeType.PAGE_DELETE && approvedChangeIds.has(c.id))
            .map(c => c.target_page_number)
        );

        const approvedReplaces = new Map<number, AppChangeLogItem>(pageChanges
            .filter(c => c.change_type === ChangeType.PAGE_REPLACE && approvedChangeIds.has(c.id) && c.target_page_number)
            .map(c => [c.target_page_number!, c])
        );

        const approvedAdds = pageChanges
            .filter(c => c.change_type === ChangeType.PAGE_ADD && approvedChangeIds.has(c.id));

        // 1. Start with a clean slate of all original pages.
        let tempMap: PageMapItem[] = [];
        for (let i = 1; i <= basePageCount; i++) {
            tempMap.push({
                conformed_page_number: 0, // temp
                source_document: 'original',
                source_page_number: i,
                reason: `Original page ${i}`,
                original_document_type: docType
            });
        }
        
        // 2. Apply replacements. This is more efficient than filtering deletes first.
        tempMap = tempMap.map(originalPageItem => {
            const replacementChange = approvedReplaces.get(originalPageItem.source_page_number);
            if (replacementChange) {
                return {
                    conformed_page_number: 0, // temp
                    source_document: 'addendum',
                    source_page_number: replacementChange.source_page,
                    reason: replacementChange.description,
                    original_page_for_comparison: replacementChange.target_page_number,
                    addendum_name: replacementChange.addendum_name,
                    original_document_type: replacementChange.source_original_document,
                };
            }
            return originalPageItem;
        });

        // 3. Apply deletions. Filter out pages that are still 'original' and are in the delete set.
        tempMap = tempMap.filter(pageItem => {
            if (pageItem.source_document === 'original') {
                return !approvedDeletes.has(pageItem.source_page_number);
            }
            return true;
        });

        // 4. Apply additions. Splice them in.
        approvedAdds.sort((a, b) => (a.insert_after_original_page_number || 0) - (b.insert_after_original_page_number || 0));

        approvedAdds.forEach(add => {
            const newPage: PageMapItem = {
                conformed_page_number: 0, // temp
                source_document: 'addendum',
                source_page_number: add.source_page,
                reason: add.description,
                insert_after_original_page_number: add.insert_after_original_page_number,
                addendum_name: add.addendum_name,
                original_document_type: add.source_original_document
            };
            const insertAfter = add.insert_after_original_page_number || 0;

            if (insertAfter === 0) {
                tempMap.unshift(newPage);
            } else {
                const insertIndex = tempMap.findIndex(p => p.source_document === 'original' && p.source_page_number === insertAfter);
                if (insertIndex > -1) {
                    tempMap.splice(insertIndex + 1, 0, newPage);
                } else {
                    tempMap.push(newPage); 
                }
            }
        });

        // 5. Final re-sequencing and attaching text changes.
        return tempMap.map((mapItem, index) => {
            const conformedPageNumber = index + 1;
            const finalMapItem = { ...mapItem, conformed_page_number: conformedPageNumber };

            if (finalMapItem.source_document === 'addendum') {
                return {
                    map: finalMapItem,
                    conformedPageNumber,
                    approvedTextChanges: [], // No text changes on new/replaced pages
                };
            }
            
            const originalPageNumber = finalMapItem.source_page_number;
            const changesForPage = approvedTextChanges.filter(c => c.original_page_number === originalPageNumber);
            
            return {
                map: finalMapItem,
                conformedPageNumber,
                approvedTextChanges: changesForPage,
            };
        });

    }, [changeLogForThisDoc, basePageCount, docType]);
};
