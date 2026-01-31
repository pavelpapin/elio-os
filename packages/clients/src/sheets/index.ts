/**
 * Google Sheets Integration
 * Read, write, and manage spreadsheets
 */

// Types
export type {
  SheetRange,
  Spreadsheet,
  CellFormat,
  FormatRequest,
  FindResult,
} from './types.js';

// Data operations
export {
  getSpreadsheet,
  getRange,
  getMultipleRanges,
  getSheetData,
  updateRange,
  appendRows,
  clearRange,
  batchUpdate,
  addSheet,
  deleteSheet,
  renameSheet,
  findInSheet,
  getSheetIdByName,
} from './data.js';

// Formatting
export {
  formatCells,
  setColumnWidth,
  setRowHeight,
  autoResizeColumns,
} from './formatting.js';

// Utilities
export { columnToLetter, letterToColumn, rangeA1 } from './utils.js';

// Client
export { isAuthenticated, getAuthInstructions } from './client.js';
