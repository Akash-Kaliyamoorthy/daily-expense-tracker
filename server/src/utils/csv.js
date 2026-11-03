'use strict';

/**
 * Minimal, safe CSV writer.
 *  - Quotes cells containing commas, quotes or newlines (RFC 4180).
 *  - Neutralises spreadsheet formula injection: a note like "=HYPERLINK(...)"
 *    is prefixed with an apostrophe so Excel / Sheets treat it as text.
 *  - Starts with a UTF-8 BOM so Excel shows "₹" and Indian-language notes correctly.
 */
const UTF8_BOM = String.fromCharCode(0xfeff);

function escapeCell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * @param {Array<object>} rows
 * @param {Array<{key: string, header: string}>} columns
 */
function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  return `${UTF8_BOM}${[header, ...lines].join('\r\n')}\r\n`;
}

module.exports = { toCsv, escapeCell };
