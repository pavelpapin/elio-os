/**
 * Google Sheets Type Definitions
 */

export interface SheetRange {
  values: string[][];
  range: string;
}

export interface Spreadsheet {
  spreadsheetId: string;
  title: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    rowCount: number;
    columnCount: number;
  }>;
}

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  backgroundColor?: { red: number; green: number; blue: number };
  textColor?: { red: number; green: number; blue: number };
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface FormatRequest {
  sheetId: number;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  format: CellFormat;
}

export interface FindResult {
  row: number;
  column: number;
  value: string;
}
