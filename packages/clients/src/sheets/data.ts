/**
 * Google Sheets Data Operations
 */

import { sheetsRequest } from './client.js';
import type { SheetRange, Spreadsheet, FindResult } from './types.js';

export async function getSpreadsheet(spreadsheetId: string): Promise<Spreadsheet> {
  const response = await sheetsRequest<{
    spreadsheetId: string;
    properties: { title: string };
    sheets: Array<{
      properties: {
        sheetId: number;
        title: string;
        gridProperties: { rowCount: number; columnCount: number };
      };
    }>;
  }>(spreadsheetId, '');

  return {
    spreadsheetId: response.spreadsheetId,
    title: response.properties.title,
    sheets: response.sheets.map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties.rowCount,
      columnCount: s.properties.gridProperties.columnCount,
    })),
  };
}

export async function getRange(spreadsheetId: string, range: string): Promise<SheetRange> {
  const response = await sheetsRequest<{ range: string; values?: string[][] }>(
    spreadsheetId,
    `values/${encodeURIComponent(range)}`
  );
  return { range: response.range, values: response.values || [] };
}

export async function getMultipleRanges(
  spreadsheetId: string,
  ranges: string[]
): Promise<SheetRange[]> {
  const rangesParam = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const response = await sheetsRequest<{
    valueRanges: Array<{ range: string; values?: string[][] }>;
  }>(spreadsheetId, `values:batchGet?${rangesParam}`);
  return response.valueRanges.map((vr) => ({ range: vr.range, values: vr.values || [] }));
}

export async function getSheetData(spreadsheetId: string, sheetName: string): Promise<SheetRange> {
  return getRange(spreadsheetId, sheetName);
}

export async function updateRange(
  spreadsheetId: string,
  range: string,
  values: string[][],
  options: { raw?: boolean } = {}
): Promise<{ updatedCells: number; updatedRows: number; updatedColumns: number }> {
  const valueInputOption = options.raw ? 'RAW' : 'USER_ENTERED';
  return sheetsRequest(
    spreadsheetId,
    `values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`,
    'PUT',
    { values }
  );
}

export async function appendRows(
  spreadsheetId: string,
  range: string,
  values: string[][],
  options: { raw?: boolean } = {}
): Promise<{ updatedCells: number; updatedRows: number }> {
  const valueInputOption = options.raw ? 'RAW' : 'USER_ENTERED';
  const response = await sheetsRequest<{
    updates: { updatedCells: number; updatedRows: number };
  }>(
    spreadsheetId,
    `values/${encodeURIComponent(range)}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`,
    'POST',
    { values }
  );
  return response.updates;
}

export async function clearRange(spreadsheetId: string, range: string): Promise<boolean> {
  await sheetsRequest(spreadsheetId, `values/${encodeURIComponent(range)}:clear`, 'POST');
  return true;
}

export async function batchUpdate(
  spreadsheetId: string,
  updates: Array<{ range: string; values: string[][] }>
): Promise<{ totalUpdatedCells: number }> {
  return sheetsRequest(spreadsheetId, 'values:batchUpdate', 'POST', {
    valueInputOption: 'USER_ENTERED',
    data: updates,
  });
}

export async function addSheet(
  spreadsheetId: string,
  title: string,
  options: { rowCount?: number; columnCount?: number } = {}
): Promise<{ sheetId: number; title: string }> {
  const response = await sheetsRequest<{
    replies: Array<{ addSheet: { properties: { sheetId: number; title: string } } }>;
  }>(spreadsheetId, ':batchUpdate', 'POST', {
    requests: [
      {
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: options.rowCount || 1000,
              columnCount: options.columnCount || 26,
            },
          },
        },
      },
    ],
  });
  return response.replies[0].addSheet.properties;
}

export async function deleteSheet(spreadsheetId: string, sheetId: number): Promise<boolean> {
  await sheetsRequest(spreadsheetId, ':batchUpdate', 'POST', {
    requests: [{ deleteSheet: { sheetId } }],
  });
  return true;
}

export async function renameSheet(
  spreadsheetId: string,
  sheetId: number,
  newTitle: string
): Promise<boolean> {
  await sheetsRequest(spreadsheetId, ':batchUpdate', 'POST', {
    requests: [
      { updateSheetProperties: { properties: { sheetId, title: newTitle }, fields: 'title' } },
    ],
  });
  return true;
}

export async function findInSheet(
  spreadsheetId: string,
  sheetName: string,
  searchValue: string,
  column?: number
): Promise<FindResult[]> {
  const data = await getSheetData(spreadsheetId, sheetName);
  const results: FindResult[] = [];

  data.values.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (column !== undefined && colIndex !== column - 1) return;
      if (cell.toLowerCase().includes(searchValue.toLowerCase())) {
        results.push({ row: rowIndex + 1, column: colIndex + 1, value: cell });
      }
    });
  });
  return results;
}

export async function getSheetIdByName(
  spreadsheetId: string,
  sheetName: string
): Promise<number | null> {
  const spreadsheet = await getSpreadsheet(spreadsheetId);
  const sheet = spreadsheet.sheets.find((s) => s.title === sheetName);
  return sheet ? sheet.sheetId : null;
}
