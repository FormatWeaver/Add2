

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { AppChangeLogItem, ChangeType, ChangeStatus, ConformingPlan, ConformedPageInfo, QAndAItem } from '../types';

// --- HELPER FUNCTIONS FOR JSPDF REPORTS (Summary & Comparison) ---

const createJSPdfHeader = (doc: jsPDF, title: string, sourceAddendum: string) => {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("AddendaConform", 15, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 15, 28);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Source Addendum: ${sourceAddendum}`, 15, 34);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 15, 20, { align: 'right'});
};

const addJSPdfFooters = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        const text = `Page ${i} of ${pageCount} | AddendaConform Report`;
        doc.text(text, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
};

// --- CORE PDF MANIPULATION LOGIC FOR CONFORMED DOCUMENT (using pdf-lib) ---

/**
 * Finds all occurrences of a search string (which can be multi-line) on a PDF page
 * and returns their bounding boxes in pdf-lib coordinate space (origin bottom-left).
 * @param pdfJsPage A loaded pdf.js page object.
 * @param searchText The text to find.
 * @returns An array of coordinate objects { x, y, width, height }.
 */
const findTextCoordinatesOnPage = async (pdfJsPage: any, searchText: string) => {
    if (!searchText) return [];
    const textContent = await pdfJsPage.getTextContent();
    const viewport = pdfJsPage.getViewport({ scale: 1 });
    const items = textContent.items as any[];

    // Create a page string and a map from each character to its item index.
    let pageText = "";
    const charToItemMap: number[] = [];
    for (let i = 0; i < items.length; i++) {
        const itemText = items[i].str;
        pageText += itemText;
        for (let j = 0; j < itemText.length; j++) {
            charToItemMap.push(i);
        }
    }

    // Normalize both texts to handle variations in whitespace and line breaks.
    const normalizedPageText = pageText.replace(/\s+/g, ' ');
    const normalizedSearchText = searchText.replace(/\s+/g, ' ');

    const allCoordinates = [];
    let lastIndex = -1;

    while ((lastIndex = normalizedPageText.indexOf(normalizedSearchText, lastIndex + 1)) !== -1) {
        const startCharIndex = lastIndex;
        const endCharIndex = lastIndex + normalizedSearchText.length;

        const startItemIndex = charToItemMap[startCharIndex];
        let endItemIndex = startItemIndex;
        for (let i = startCharIndex; i < endCharIndex; i++) {
            if (charToItemMap[i] > endItemIndex) {
                endItemIndex = charToItemMap[i];
            }
        }
        
        if (startItemIndex === undefined || endItemIndex === undefined) continue;

        const relevantItems = items.slice(startItemIndex, endItemIndex + 1);
        if (relevantItems.length === 0) continue;

        const x = Math.min(...relevantItems.map(item => item.transform[4]));
        const y_top = Math.min(...relevantItems.map(item => item.transform[5]));
        const width = Math.max(...relevantItems.map(item => item.transform[4] + item.width)) - x;
        const height = Math.max(...relevantItems.map(item => item.transform[5] + item.height)) - y_top;
        
        // Convert to pdf-lib coordinates (origin bottom-left)
        const pdfY = viewport.height - (y_top + height);

        allCoordinates.push({ x, y: pdfY, width, height });
    }
    
    return allCoordinates;
};


/**
 * Exports a "clean" version of the document based on the dynamically generated ConformedPageInfo array.
 * This version ONLY applies changes that have been explicitly approved by the user.
 * It now accepts loaded PDF document proxies instead of raw File objects.
 */
export async function exportConformedDocumentAsPdf(
    baseDocumentProxy: pdfjsLib.PDFDocumentProxy,
    addendaProxies: Map<string, pdfjsLib.PDFDocumentProxy>,
    conformedDocument: ConformedPageInfo[]
) {
    if (!baseDocumentProxy) {
        throw new Error("Base document is missing.");
    }
    try {
        const finalPdfDoc = await PDFDocument.create();
        
        const basePdfBytes = await baseDocumentProxy.getData();
        const basePdf = await PDFDocument.load(basePdfBytes);
        
        const addendumDocs = new Map<string, PDFDocument>();
        for (const [name, proxy] of addendaProxies.entries()) {
            const docBytes = await proxy.getData();
            addendumDocs.set(name, await PDFDocument.load(docBytes));
        }

        const helveticaFont = await finalPdfDoc.embedFont(StandardFonts.Helvetica);

        for (const pageInfo of conformedDocument) {
            const mapItem = pageInfo.map;
            let sourcePdf: PDFDocument;
            
            if (mapItem.source_document === 'original') {
                sourcePdf = basePdf;
            } else {
                if (!mapItem.addendum_name || !addendumDocs.has(mapItem.addendum_name)) {
                    console.error(`Could not find loaded PDF for addendum: ${mapItem.addendum_name}. Skipping page.`);
                    continue; 
                }
                sourcePdf = addendumDocs.get(mapItem.addendum_name)!;
            }
            
            const [copiedPage] = await finalPdfDoc.copyPages(sourcePdf, [mapItem.source_page_number - 1]);
            const { width, height } = copiedPage.getSize();
            
            // CRITICAL FIX: Only apply text changes if the page is from the ORIGINAL document.
            // This enforces the "clean slate" rule for replaced/added pages.
            if (mapItem.source_document === 'original' && pageInfo.approvedTextChanges.length > 0) {
                const pdfJsPage = await baseDocumentProxy.getPage(mapItem.source_page_number);

                for (const change of pageInfo.approvedTextChanges) {
                    if (change.change_type === ChangeType.TEXT_DELETE || change.change_type === ChangeType.TEXT_REPLACE) {
                         const coords = await findTextCoordinatesOnPage(pdfJsPage, change.exact_text_to_find!);
                         for (const c of coords) {
                             copiedPage.drawRectangle({
                                 x: c.x,
                                 y: c.y,
                                 width: c.width,
                                 height: c.height,
                                 color: rgb(1, 1, 1), // Whiteout
                             });
                         }
                    }

                    if ((change.change_type === ChangeType.TEXT_ADD || change.change_type === ChangeType.TEXT_REPLACE) && change.new_text_to_insert) {
                        const coords = await findTextCoordinatesOnPage(pdfJsPage, change.exact_text_to_find || change.location_hint);
                        if(coords[0]) {
                            // The y-coordinate for drawText is the baseline of the first line.
                            // To position the new text correctly, we use the top of the found text box
                            // as the starting point, since text is drawn upwards from the baseline.
                            const fontSize = 9;
                            const newY = coords[0].y + coords[0].height - fontSize;

                            copiedPage.drawText(change.new_text_to_insert, {
                                x: coords[0].x,
                                y: newY,
                                size: fontSize,
                                font: helveticaFont,
                                color: rgb(0, 0, 0),
                                maxWidth: coords[0].width, // Wrap text within the original width.
                                lineHeight: 10,
                            });
                        } else {
                             copiedPage.drawText(`ADDENDUM NOTE: ${change.location_hint} - ${change.new_text_to_insert}`, {
                                x: 20,
                                y: height - 30,
                                size: 10,
                                font: helveticaFont,
                                color: rgb(0.8, 0, 0),
                            });
                        }
                    }
                }
                pdfJsPage.cleanup();
            }

            finalPdfDoc.addPage(copiedPage);
        }

        const title = basePdf.getTitle();
        let docName = 'Document';
        if (conformedDocument.length > 0) {
            docName = conformedDocument[0].map.original_document_type === 'drawings' ? 'Drawings' : 'Specifications';
        }

        const cleanTitle = title?.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_') || docName;

        const pdfBytes = await finalPdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Conformed_${cleanTitle}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Failed to generate conformed PDF:", error);
        throw new Error("An error occurred while generating the conformed PDF. See the console for details.");
    }
}


// --- JSPDF-BASED REPORT EXPORTS ---

export function exportChangeLogAsPdf(changeLog: AppChangeLogItem[], documentTitle: string) {
    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const sourceAddendum = changeLog[0]?.addendum_name || 'N/A';
        createJSPdfHeader(doc, "Summary of Changes Report", sourceAddendum);

        const tableColumn = ["Status", "Type", "Spec/Doc", "Location", "Change Details"];
        const tableRows: (string | { content: string, styles: { textColor: number[], fontStyle?: 'bold' } })[][] = [];

        changeLog.forEach(item => {
            const details = item.new_text_to_insert || `Original: ${item.exact_text_to_find}` || 'N/A';
            let statusStyle: { textColor: number[], fontStyle?: 'bold' } = { textColor: [0, 0, 0] };
            if (item.status === ChangeStatus.APPROVED) statusStyle = { textColor: [5, 150, 105], fontStyle: 'bold' };
            if (item.status === ChangeStatus.REJECTED) statusStyle = { textColor: [200, 50, 50], fontStyle: 'bold' };
            if (item.status === ChangeStatus.PENDING) statusStyle = { textColor: [200, 150, 0], fontStyle: 'bold' };
            
            const changeTypeText = item.change_type.replace(/_/g, ' ');

            tableRows.push([
                { content: item.status, styles: statusStyle },
                changeTypeText,
                item.spec_section || 'N/A',
                item.location_hint || 'N/A',
                details
            ]);
        });
          
        autoTable(doc, {
            startY: 45,
            head: [tableColumn],
            body: tableRows as any,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { cellPadding: 2.5, fontSize: 8 },
            columnStyles: { 4: { cellWidth: 70 } }
        });

        addJSPdfFooters(doc);
        const cleanTitle = documentTitle.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
        doc.save(`Summary_${cleanTitle}.pdf`);
    } catch (error) {
        console.error("Failed to generate summary PDF:", error);
        throw new Error("An error occurred while generating the summary PDF. See the console for details.");
    }
}


export function exportComparisonDocumentAsPdf(changeLog: AppChangeLogItem[], documentTitle: string) {
    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const sourceAddendum = changeLog[0]?.addendum_name || 'N/A';
        createJSPdfHeader(doc, "Comparison Document (Tracked)", sourceAddendum);

        const tableColumn = ["Status", "Location", "Change Details"];
        const tableRows: any[][] = [];

        changeLog.forEach(item => {
            let details = '';
            const before = item.exact_text_to_find || '[No original content specified]';
            const after = item.new_text_to_insert || '[No new content specified]';

            switch(item.change_type) {
                case ChangeType.TEXT_ADD:
                case ChangeType.PAGE_ADD:
                    details = `ACTION: ADD\n\nADDED:\n${after}`;
                    break;
                case ChangeType.TEXT_DELETE:
                case ChangeType.PAGE_DELETE:
                    details = `ACTION: DELETE\n\nDELETED:\n${before}`;
                    break;
                case ChangeType.TEXT_REPLACE:
                case ChangeType.PAGE_REPLACE:
                    details = `ACTION: REPLACE\n\nBEFORE:\n${before}\n\nAFTER:\n${after}`;
                    break;
                case ChangeType.GENERAL_NOTE:
                    details = `ACTION: ${item.change_type}\n\nNOTE/CHANGE:\n${after}`;
                    break;
            }
            
            const location = [item.spec_section, item.location_hint]
                .filter(val => !!val)
                .join('\n') || 'N/A';

            let statusStyle = { textColor: [0, 0, 0] };
            if (item.status === ChangeStatus.APPROVED) statusStyle = { textColor: [5, 150, 105] };
            if (item.status === ChangeStatus.REJECTED) statusStyle = { textColor: [200, 50, 50] };
            
            tableRows.push([
                { content: item.status, styles: { ...statusStyle, fontStyle: 'bold' } },
                location, 
                details
            ]);
        });

        autoTable(doc, {
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            styles: { cellPadding: 2.5, fontSize: 9, valign: 'top' },
            columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 55 }, 2: { cellWidth: 'auto' } },
        });
        
        addJSPdfFooters(doc);
        const cleanTitle = documentTitle.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
        doc.save(`Comparison_${cleanTitle}.pdf`);
    } catch (error) {
        console.error("Failed to generate comparison PDF:", error);
        throw new Error("An error occurred while generating the comparison PDF. See the console for details.");
    }
}


export function exportQandAAsPdf(qaLog: QAndAItem[], documentTitle: string) {
    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("Addenda Q&A Report", 15, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 15, 20, { align: 'right'});


        const tableColumn = ["Discipline", "Source", "Question & Answer"];
        const tableRows: any[][] = [];

        qaLog.forEach(item => {
            const question = `Q: ${item.question}`;
            const answer = `A: ${item.answer}`;
            
            tableRows.push([
                item.discipline || 'General',
                item.source_addendum_file || 'N/A',
                `${question}\n\n${answer}`,
            ]);
        });
          
        autoTable(doc, {
            startY: 30,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { cellPadding: 3, fontSize: 9, valign: 'top' },
            columnStyles: { 
                0: { cellWidth: 30 },
                1: { cellWidth: 40 },
                2: { cellWidth: 'auto' },
            }
        });
        
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        doc.save(`Q&A_Report_${documentTitle}.pdf`);
    } catch (error) {
        console.error("Failed to generate Q&A PDF:", error);
        throw new Error("An error occurred while generating the Q&A PDF.");
    }
}
