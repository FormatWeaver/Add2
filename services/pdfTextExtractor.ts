import * as pdfjsLib from 'pdfjs-dist';

interface Rect { x: number; y: number; width: number; height: number; }

/**
 * Extracts text contained within a specified rectangle on a PDF page.
 * @param page A loaded pdf.js page object.
 * @param rect The selection rectangle in canvas coordinates.
 * @param viewport The pdf.js viewport used for rendering.
 * @returns A promise that resolves to the extracted text string.
 */
export const extractTextInRect = async (page: any, rect: Rect, viewport: any): Promise<string> => {
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    const selectedTexts = [];

    for (const item of items) {
        // Get the bounding box of the text item in canvas coordinates
        const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
            item.transform[4],
            item.transform[5],
            item.transform[4] + item.width,
            item.transform[5] + item.height,
        ]);
        const itemRect = { x: x1, y: y1, width: x2 - x1, height: y2 - y1, text: item.str };

        // Check for intersection between the user's selection and the text item's box
        if (
            itemRect.x < rect.x + rect.width &&
            itemRect.x + itemRect.width > rect.x &&
            itemRect.y < rect.y + rect.height &&
            itemRect.y + itemRect.height > rect.y
        ) {
            selectedTexts.push({ ...itemRect, bottom: y2 });
        }
    }

    // Sort selected texts by their vertical position (top to bottom) to ensure correct reading order.
    selectedTexts.sort((a, b) => a.y - b.y);
    
    return selectedTexts.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim();
};
