/**
 * Google Sheets Utility Functions
 */

/**
 * Convert column number to letter (1 -> A, 27 -> AA)
 */
export function columnToLetter(column: number): string {
  let result = '';
  while (column > 0) {
    const mod = (column - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    column = Math.floor((column - mod) / 26);
  }
  return result;
}

/**
 * Convert column letter to number (A -> 1, AA -> 27)
 */
export function letterToColumn(letter: string): number {
  let column = 0;
  for (let i = 0; i < letter.length; i++) {
    column = column * 26 + (letter.charCodeAt(i) - 64);
  }
  return column;
}

/**
 * Build A1 notation range string
 */
export function rangeA1(
  sheet: string,
  startCol: number,
  startRow: number,
  endCol?: number,
  endRow?: number
): string {
  const start = `${columnToLetter(startCol)}${startRow}`;
  if (endCol && endRow) {
    return `'${sheet}'!${start}:${columnToLetter(endCol)}${endRow}`;
  }
  return `'${sheet}'!${start}`;
}
