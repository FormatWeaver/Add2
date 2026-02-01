
import { AppChangeLogItem, ChangeType, ClickableArea } from '../types';

const normalize = (text: string | undefined | null): string => {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
};

const findTextCoordinates = async (page: any, searchText: string) => {
    if (!searchText) return [];
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // Build map for better multi-line resilience
    let pageText = "";
    const charToItemMap: { itemIdx: number; charInItemIdx: number }[] = [];
    
    items.forEach((item, itemIdx) => {
        const str = item.str;
        for (let charInItemIdx = 0; charInItemIdx < str.length; charInItemIdx++) {
            charToItemMap.push({ itemIdx, charInItemIdx });
        }
        pageText += str;
    });

    const normPage = normalize(pageText);
    const normSearch = normalize(searchText);
    if (!normSearch) return [];

    const allCoords = [];
    let lastIndex = -1;

    // Use normalized search but map back to original indices
    while ((lastIndex = normPage.indexOf(normSearch, lastIndex + 1)) !== -1) {
        // Simple mapping: search is normalized, so we find approximate bounds in original pageText
        // For precision in PDFs, we find items that contain parts of the search string
        const startIdx = Math.floor((lastIndex / normPage.length) * pageText.length);
        const endIdx = Math.floor(((lastIndex + normSearch.length) / normPage.length) * pageText.length);
        
        const relevantItems = new Set<number>();
        for (let k = Math.max(0, startIdx - 5); k < Math.min(pageText.length, endIdx + 5); k++) {
            if (charToItemMap[k]) relevantItems.add(charToItemMap[k].itemIdx);
        }

        const itemsToMeasure = Array.from(relevantItems).map(idx => items[idx]).filter(Boolean);
        if (itemsToMeasure.length === 0) continue;

        const x = Math.min(...itemsToMeasure.map(item => item.transform[4]));
        const y = Math.min(...itemsToMeasure.map(item => item.transform[5]));
        const width = Math.max(...itemsToMeasure.map(item => item.transform[4] + item.width)) - x;
        const height = Math.max(...itemsToMeasure.map(item => item.transform[5] + item.height)) - y;

        allCoords.push({ x, y, width, height });
    }

    return allCoords;
};

export const drawSpotlightAnnotation = async (ctx: CanvasRenderingContext2D, page: any, viewport: any, change: AppChangeLogItem) => {
    if (change.change_type.startsWith('PAGE_')) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        return;
    }
    const term = change.exact_text_to_find || change.location_hint;
    if (!term) return;
    const coords = await findTextCoordinates(page, term);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)'; // Amber spotlight
    coords.forEach(c => {
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([c.x, c.y, c.x + c.width, c.y + c.height]);
        ctx.fillRect(x1 - 2, y1 - 2, (x2 - x1) + 4, (y2 - y1) + 4);
    });
};

export const drawAnnotations = async (ctx: CanvasRenderingContext2D, page: any, viewport: any, changes: AppChangeLogItem[]): Promise<ClickableArea[]> => {
    const clickableAreas: ClickableArea[] = [];
    const scale = viewport.scale;
    const marginX = viewport.width * 0.76;
    const marginWidth = viewport.width * 0.22;
    let marginY = 50;

    for (const change of changes) {
        const term = change.exact_text_to_find || change.location_hint;
        if (!term) continue;
        const coords = await findTextCoordinates(page, term);
        
        const isDelete = change.change_type.includes('DELETE') || change.change_type.includes('REPLACE');
        const color = isDelete ? '#ef4444' : '#3b82f6';

        coords.forEach(c => {
            const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([c.x, c.y, c.x + c.width, c.y + c.height]);
            ctx.fillStyle = isDelete ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.1)';
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            clickableAreas.push({ x: x1, y: y1, width: x2 - x1, height: y2 - y1, changeId: change.id });
        });

        // Drawing sidebar callouts
        if (coords.length > 0) {
            const c = coords[0];
            const [x1, y1] = viewport.convertToViewportRectangle([c.x, c.y, c.x + c.width, c.y + c.height]);
            
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.setLineDash([2, 2]);
            ctx.moveTo(x1, y1 + 5);
            ctx.lineTo(marginX, marginY + 10);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = isDelete ? '#fef2f2' : '#eff6ff';
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.roundRect(marginX, marginY, marginWidth, 30 * scale, 4 * scale);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = color;
            ctx.font = `bold ${10 * scale}px sans-serif`;
            ctx.fillText(change.change_type.replace('TEXT_', ''), marginX + 5, marginY + 18 * scale);
            
            clickableAreas.push({ x: marginX, y: marginY, width: marginWidth, height: 30 * scale, changeId: change.id });
            marginY += 40 * scale;
        }
    }
    return clickableAreas;
};
