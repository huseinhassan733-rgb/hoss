/**
 * Document Sequencing & Auto Serial Number Utility
 * نظام الترقيم والتسلسل التلقائي للمستندات المحاسبية والمخزنية بدءاً من الرقم 1
 */

/**
 * Extracts numeric sequence from any document number string or number.
 * Supports "1", 1, "JV-2026-0001", "INV-1", etc.
 */
export function extractDocSeqNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  const str = String(val).trim();
  // If pure number string like "1", "25"
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // If contains hyphens/letters e.g. "JV-2026-0005" -> extract last numeric block
  const matches = str.match(/\d+/g);
  if (matches && matches.length > 0) {
    const lastNum = parseInt(matches[matches.length - 1], 10);
    return isNaN(lastNum) ? 0 : lastNum;
  }

  return 0;
}

/**
 * Calculates the next automatic sequential serial number starting from 1.
 * If no documents exist, returns 1.
 * Otherwise returns (highest sequential number found + 1).
 */
export function getNextDocSeq(docs: any[], key: string): string {
  if (!docs || docs.length === 0) return '1';

  let maxSeq = 0;
  for (const doc of docs) {
    const seq = extractDocSeqNumber(doc[key]);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return String(maxSeq + 1);
}

/**
 * Formats a document number cleanly. If user enters "1", keep "1".
 */
export function formatDocNumber(num: number | string): string {
  if (typeof num === 'number') return String(num);
  return num || '1';
}
