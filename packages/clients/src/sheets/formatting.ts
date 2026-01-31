/**
 * Google Sheets Formatting Operations
 */

import { sheetsRequest } from './client.js';
import type { CellFormat, FormatRequest } from './types.js';

function buildCellFormat(format: CellFormat): {
  userEnteredFormat: Record<string, unknown>;
  fields: string;
} {
  const result: Record<string, unknown> = {};
  const fields: string[] = [];

  if (format.bold !== undefined || format.italic !== undefined || format.fontSize !== undefined) {
    result.textFormat = {};
    if (format.bold !== undefined) {
      (result.textFormat as Record<string, unknown>).bold = format.bold;
      fields.push('userEnteredFormat.textFormat.bold');
    }
    if (format.italic !== undefined) {
      (result.textFormat as Record<string, unknown>).italic = format.italic;
      fields.push('userEnteredFormat.textFormat.italic');
    }
    if (format.fontSize !== undefined) {
      (result.textFormat as Record<string, unknown>).fontSize = format.fontSize;
      fields.push('userEnteredFormat.textFormat.fontSize');
    }
  }

  if (format.backgroundColor) {
    result.backgroundColor = format.backgroundColor;
    fields.push('userEnteredFormat.backgroundColor');
  }

  if (format.textColor) {
    if (!result.textFormat) result.textFormat = {};
    (result.textFormat as Record<string, unknown>).foregroundColor = format.textColor;
    fields.push('userEnteredFormat.textFormat.foregroundColor');
  }

  if (format.horizontalAlignment) {
    result.horizontalAlignment = format.horizontalAlignment;
    fields.push('userEnteredFormat.horizontalAlignment');
  }

  return { userEnteredFormat: result, fields: fields.join(',') };
}

export async function formatCells(
  spreadsheetId: string,
  requests: FormatRequest[]
): Promise<boolean> {
  const batchRequests = requests.map((req) => {
    const { userEnteredFormat, fields } = buildCellFormat(req.format);
    return {
      repeatCell: {
        range: {
          sheetId: req.sheetId,
          startRowIndex: req.startRow,
          endRowIndex: req.endRow,
          startColumnIndex: req.startCol,
          endColumnIndex: req.endCol,
        },
        cell: { userEnteredFormat },
        fields,
      },
    };
  });

  await sheetsRequest(spreadsheetId, ':batchUpdate', 'POST', { requests: batchRequests });
  return true;
}

export async function setColumnWidth(
  spreadsheetId: string,
  sheetId: number,
  startCol: number,
  endCol: number,
  pixelSize: number
): Promise<boolean> {
  await sheetsRequest(spreadsheetId, ':batchUpdate', 'POST', {
    requests: [
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: startCol, endIndex: endCol },
          properties: { pixelSize },
          fields: 'pixelSize',
        },
      },
    ],
  });
  return true;
}

export async function setRowHeight(
  spreadsheetId: string,
  sheetId: number,
  startRow: number,
  endRow: number,
  pixelSize: number
): Promise<boolean> {
  await sheetsRequest(spreadsheetId, ':batchUpdate', 'POST', {
    requests: [
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: 'ROWS', startIndex: startRow, endIndex: endRow },
          properties: { pixelSize },
          fields: 'pixelSize',
        },
      },
    ],
  });
  return true;
}

export async function autoResizeColumns(
  spreadsheetId: string,
  sheetId: number,
  startCol: number,
  endCol: number
): Promise<boolean> {
  await sheetsRequest(spreadsheetId, ':batchUpdate', 'POST', {
    requests: [
      {
        autoResizeDimensions: {
          dimensions: { sheetId, dimension: 'COLUMNS', startIndex: startCol, endIndex: endCol },
        },
      },
    ],
  });
  return true;
}
