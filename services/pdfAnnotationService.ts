import { AppChangeLogItem, ChangeType, ClickableArea } from '../types';

/**
 * Normalizes text for more reliable matching by removing extra whitespace and converting to lowercase.
 * @param text The input string.
 * @returns The normalized string.
 */
const normalizeText = (text: string | undefined | null): string => {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
};

/**
 * Finds all occurrences of a search string (which can be multi-line) on a PDF page
 * and returns their bounding boxes.
 * @param page A loaded pdf.js page object.
 * @param searchText The text to find.
 * @returns An array of coordinate objects { x, y, width, height }.
 */
const findTextCoordinates = async (page: any, searchText: string) => {
    if (!searchText) return [];
    const textContent = await page.getTextContent();
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
        const y = Math.min(...relevantItems.map(item => item.transform[5]));
        const width = Math.max(...relevantItems.map(item => item.transform[4] + item.width)) - x;
        const height = Math.max(...relevantItems.map(item => item.transform[5] + item.height)) - y;

        allCoordinates.push({ x, y, width, height });
    }

    return allCoordinates;
};

// Helper to wrap text for margin notes
function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

/**
 * Draws a semi-transparent highlight over the area of a change.
 * Used for the "Spotlight on Hover" feature.
 */
export const drawSpotlightAnnotation = async (
    ctx: CanvasRenderingContext2D,
    page: any,
    viewport: any,
    change: AppChangeLogItem
) => {
    if (!change) return;

    if (change.change_type.startsWith('PAGE_')) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.2)';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        return;
    }

    const searchText = change.exact_text_to_find || change.location_hint;
    if (!searchText) return;
    const coords = await findTextCoordinates(page, searchText);

    if (coords.length > 0) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.4)'; // A nice highlight yellow
        for (const c of coords) {
            const canvasRect = viewport.convertToViewportRectangle([c.x, c.y, c.x + c.width, c.y + c.height]);
            const [x1, y1, x2, y2] = canvasRect;
            const padding = 2 * viewport.scale;
            ctx.fillRect(x1 - padding, y1 - padding, (x2 - x1) + (padding * 2), (y2 - y1) + (padding * 2));
        }
    }
};


export const drawAnnotations = async (
    ctx: CanvasRenderingContext2D,
    page: any,
    viewport: any,
    changes: AppChangeLogItem[]
): Promise<ClickableArea[]> => {
    if (!changes || changes.length === 0) return [];
    
    const clickableAreas: ClickableArea[] = [];
    const textChanges = changes.filter(c => c.change_type.startsWith('TEXT_') && (c.exact_text_to_find || c.location_hint));
    if (textChanges.length === 0) return [];

    const marginX = viewport.width * 0.75;
    const marginWidth = viewport.width * 0.25 - 20;
    let marginNoteY = 40;
    const scale = viewport.scale;

    for (const change of textChanges) {
        let coords = [];
        let isFallback = false;
        
        if (change.exact_text_to_find) {
            coords = await findTextCoordinates(page, change.exact_text_to_find);
        }
        
        if (coords.length === 0 && change.location_hint) {
            coords = await findTextCoordinates(page, change.location_hint);
            if (coords.length > 0) {
                isFallback = true;
            }
        }
        
        if (coords.length === 0) {
            let noteText = '';
            
            switch(change.change_type) {
                case ChangeType.TEXT_REPLACE:
                    noteText = `In/Near "${change.location_hint}", REPLACE: "${change.exact_text_to_find || ''}" WITH: "${change.new_text_to_insert || ''}"`;
                    break;
                case ChangeType.TEXT_DELETE:
                    noteText = `In/Near "${change.location_hint}", DELETE: "${change.exact_text_to_find || ''}"`;
                    break;
                case ChangeType.TEXT_ADD:
                     noteText = `In/Near "${change.location_hint}", ADD: "${change.new_text_to_insert || ''}"`;
                    break;
                default:
                     noteText = `A change was noted here but its exact position could not be determined. Check addendum page ${change.source_page}.`;
            }

            // Draw a single, prominent, un-anchored note in the margin.
            const fontSize = 11 * scale;
            const lineHeight = 12 * scale;
            ctx.font = `bold ${fontSize}px Arial`;
            
            const textX = marginX + 10 * scale;
            
            const words = noteText.split(' ');
            let line = '';
            let lineCount = 1;
            for (const word of words) {
                const testLine = line + word + ' ';
                if (ctx.measureText(testLine).width > marginWidth - 20 * scale && line.length > 0) {
                    line = word + ' ';
                    lineCount++;
                } else {
                    line = testLine;
                }
            }
            const noteHeight = lineCount * lineHeight;
            const boxHeight = noteHeight + 20 * scale;
            const boxY = marginNoteY;
            
            ctx.fillStyle = 'rgba(254, 243, 199, 1)'; // Amber background for unlocated changes
            ctx.strokeStyle = 'rgba(251, 191, 36, 1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(marginX, boxY, marginWidth, boxHeight, 5 * scale);
            ctx.fill();
            ctx.stroke();
            
            clickableAreas.push({ x: marginX, y: boxY, width: marginWidth, height: boxHeight, changeId: change.id });

            ctx.fillStyle = '#78350f'; // Dark amber text
            wrapText(ctx, noteText, textX, boxY + 10 * scale + (lineHeight * 0.8), marginWidth - 10 * scale, lineHeight);
            
            marginNoteY += boxHeight + 15 * scale;
            continue; 
        }

        // --- FIXED LOGIC FOR ANCHORED NOTES ---

        // 1. Draw all on-page highlights and create clickable areas
        for (const c of coords) {
            const canvasRect = viewport.convertToViewportRectangle([c.x, c.y, c.x + c.width, c.y + c.height]);
            const [x1, y1, x2, y2] = canvasRect;

            clickableAreas.push({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, changeId: change.id });

            if (!isFallback && (change.change_type.includes('DELETE') || change.change_type.includes('REPLACE'))) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // transparent red
                ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            }
        }

        // 2. Determine the text and color theme for the single margin note
        let noteText = '';
        type NoteTheme = 'add' | 'delete' | 'fallback';
        let noteTheme: NoteTheme = 'add';

        if (isFallback) {
            noteTheme = 'fallback';
            switch(change.change_type) {
                case ChangeType.TEXT_REPLACE: noteText = `REPLACE: "${change.exact_text_to_find || ''}" WITH: "${change.new_text_to_insert || ''}"`; break;
                case ChangeType.TEXT_DELETE: noteText = `DELETE: "${change.exact_text_to_find || ''}"`; break;
                case ChangeType.TEXT_ADD: noteText = `ADD: "${change.new_text_to_insert || ''}"`; break;
            }
        } else {
            if ((change.change_type.includes('ADD') || change.change_type.includes('REPLACE')) && change.new_text_to_insert) {
                noteText = change.new_text_to_insert;
                noteTheme = 'add';
            } else if (change.change_type.includes('DELETE')) {
                noteText = `Text marked for deletion.`;
                noteTheme = 'delete';
            }
        }
        
        // 3. Draw the single margin note if there is text for it
        if (noteText) {
            const firstCoord = coords[0];
            const canvasRect = viewport.convertToViewportRectangle([firstCoord.x, firstCoord.y, firstCoord.x + firstCoord.width, firstCoord.y + firstCoord.height]);
            const [x1, y1, x2, y2] = canvasRect;

            const anchorX = x1;
            const anchorY = y1 + (y2 - y1) / 2;
            
            const fontSize = 11 * scale;
            const lineHeight = 12 * scale;
            ctx.font = `${fontSize}px Arial`;

            const textX = marginX + 10 * scale;
            
            const words = noteText.split(' ');
            let line = '';
            let lineCount = 1;
            for (const word of words) {
                const testLine = line + word + ' ';
                if (ctx.measureText(testLine).width > marginWidth - 20 * scale && line.length > 0) {
                    line = word + ' ';
                    lineCount++;
                } else {
                    line = testLine;
                }
            }
            const noteHeight = lineCount * lineHeight;
            const boxHeight = noteHeight + 20 * scale;

            const boxY = marginNoteY;

            // Set colors based on theme
            if (noteTheme === 'add') {
                ctx.fillStyle = 'rgba(236, 253, 245, 1)'; ctx.strokeStyle = 'rgba(110, 231, 183, 1)';
            } else if (noteTheme === 'delete') {
                ctx.fillStyle = 'rgba(254, 226, 226, 1)'; ctx.strokeStyle = 'rgba(248, 113, 113, 1)';
            } else { // fallback
                ctx.fillStyle = 'rgba(254, 243, 199, 1)'; ctx.strokeStyle = 'rgba(251, 191, 36, 1)';
            }
            
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(marginX, boxY, marginWidth, boxHeight, 5 * scale);
            ctx.fill();
            ctx.stroke();

            clickableAreas.push({ x: marginX, y: boxY, width: marginWidth, height: boxHeight, changeId: change.id });
            
            if (noteTheme === 'add') { ctx.fillStyle = '#047857'; }
            else if (noteTheme === 'delete') { ctx.fillStyle = '#991b1b'; }
            else { ctx.fillStyle = '#78350f'; }
            wrapText(ctx, noteText, textX, boxY + 10 * scale + (lineHeight * 0.8), marginWidth - 10 * scale, lineHeight);
            
            if (noteTheme === 'add') { ctx.strokeStyle = '#059669'; }
            else if (noteTheme === 'delete') { ctx.strokeStyle = '#ef4444'; }
            else { ctx.strokeStyle = '#d97706'; }

            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(anchorX, anchorY);
            ctx.bezierCurveTo(anchorX - 30 * scale, anchorY, marginX + 30 * scale, boxY + boxHeight / 2, marginX, boxY + boxHeight / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            marginNoteY += boxHeight + 15 * scale;
        }
    }
    return clickableAreas;
};