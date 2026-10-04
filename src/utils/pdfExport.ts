/**
 * H2pro ERP - Global PDF Generation Service
 * خدمة تصدير وطباعة التقارير بصيغة PDF الاحترافية باستخدام jspdf و jspdf-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyInfo, FinancialYear, User } from '../types';

export interface PDFTableColumn {
  header: string;
  dataKey: string;
  width?: number;
  align?: 'right' | 'left' | 'center';
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  docNumber?: string;
  columns: PDFTableColumn[];
  data: Record<string, any>[];
  company: CompanyInfo;
  activeYear?: FinancialYear;
  currentUser?: User;
  orientation?: 'portrait' | 'landscape';
  summaryRows?: { label: string; value: string | number }[];
  notes?: string;
}

/**
 * Reverse Arabic text if needed for basic LTR engines or preserve RTL
 */
export function formatArabicForPDF(text: string): string {
  if (!text) return '';
  return String(text).trim();
}

/**
 * Main PDF Generation Engine using jsPDF & jspdf-autotable
 */
export function generateProfessionalPDF(options: PDFExportOptions): jsPDF {
  const {
    title,
    subtitle = 'نظام H2pro للمحاسبة وإدارة الأعمال المتكامل',
    docNumber,
    columns,
    data,
    company,
    activeYear,
    currentUser,
    orientation = 'portrait',
    summaryRows = [],
    notes,
  } = options;

  // Initialize jsPDF document (A4 size)
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Palette colors
  const primaryNavy = [27, 58, 92]; // #1B3A5C
  const goldAccent = [196, 154, 55]; // #c49a37
  const darkSlate = [18, 40, 64]; // #122840
  const lightBg = [248, 250, 252]; // #f8fafc

  // --- 1. Company Letterhead Header ---
  // Top header bar (Navy band)
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(margin, 12, pageWidth - margin * 2, 2.5, 'F');

  // Gold accent line
  doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.rect(margin, 14.5, pageWidth - margin * 2, 1, 'F');

  // Company Name & Subtitle
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'H2pro Enterprise Systems', pageWidth - margin, 22, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 100, 115);
  doc.text(company.address || 'Kingdom of Saudi Arabia - Riyadh', pageWidth - margin, 27, { align: 'right' });

  // Contact Details & Tax ID
  const contactText = `Tel: ${company.phone || '011-4567890'} | VAT: ${company.taxNumber || '301298475600003'}`;
  doc.text(contactText, pageWidth - margin, 32, { align: 'right' });

  // Left Meta Info: Date, Doc No, Currency, Year
  const currentDate = new Date().toISOString().slice(0, 10);
  doc.setFontSize(8.5);
  doc.setTextColor(70, 80, 95);
  doc.text(`Date: ${currentDate}`, margin, 22, { align: 'left' });
  if (docNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(`Doc Ref: ${docNumber}`, margin, 27, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 80, 95);
  }
  if (activeYear) {
    doc.text(`Financial Year: ${activeYear.year} (${activeYear.status})`, margin, 32, { align: 'left' });
  }

  // Divider line
  doc.setDrawColor(210, 220, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, 36, pageWidth - margin, 36);

  // --- 2. Title Box Banner ---
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.roundedRect(margin, 39, pageWidth - margin * 2, 11, 1.5, 1.5, 'F');

  // Gold indicator strip
  doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.rect(margin, 39, 4, 11, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 8, 46.5, { align: 'left' });

  doc.setFontSize(8.5);
  doc.setTextColor(220, 230, 240);
  doc.text(subtitle, pageWidth - margin - 5, 46.5, { align: 'right' });

  // --- 3. Format Data for AutoTable ---
  const tableHeaders = columns.map((col) => col.header);
  const tableRows = data.map((row, index) => {
    return columns.map((col) => {
      if (col.dataKey === '#index') return String(index + 1);
      const val = row[col.dataKey];
      if (val === undefined || val === null) return '-';
      if (typeof val === 'number') {
        return val.toLocaleString('en-US');
      }
      return String(val);
    });
  });

  // Calculate Column Styles
  const columnStylesConfig: Record<number, any> = {};
  columns.forEach((col, idx) => {
    columnStylesConfig[idx] = {
      halign: col.align || 'right',
      cellWidth: col.width ? col.width : 'auto',
    };
  });

  // --- 4. Render Table with jspdf-autotable ---
  autoTable(doc, {
    startY: 53,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: margin, right: margin, bottom: 25 },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      font: 'helvetica',
      textColor: [40, 50, 65],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [primaryNavy[0], primaryNavy[1], primaryNavy[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [lightBg[0], lightBg[1], lightBg[2]],
    },
    columnStyles: columnStylesConfig,
    didDrawPage: (dataHook) => {
      // --- Page Footer on each page ---
      const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();

      // Top footer rule
      doc.setDrawColor(210, 220, 230);
      doc.setLineWidth(0.4);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Footer texts
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 130, 145);

      const generatedBy = currentUser ? `Generated by: ${currentUser.name} (${currentUser.username})` : 'System Generated';
      doc.text(generatedBy, margin, pageHeight - 9, { align: 'left' });

      doc.text('H2pro ERP Systems · Confidential & Certified Document', pageWidth / 2, pageHeight - 9, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    },
  });

  // --- 5. Add Summary Rows & Signatures if on last page ---
  const finalY = (doc as any).lastAutoTable?.finalY || 100;

  if (summaryRows.length > 0 && finalY < pageHeight - 45) {
    let currentY = finalY + 5;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(200, 210, 220);

    const summaryBoxWidth = 85;
    const summaryX = pageWidth - margin - summaryBoxWidth;
    const boxHeight = summaryRows.length * 6 + 6;

    doc.roundedRect(summaryX, currentY, summaryBoxWidth, boxHeight, 1, 1, 'FD');

    summaryRows.forEach((item, idx) => {
      const lineY = currentY + 5 + idx * 6;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', idx === summaryRows.length - 1 ? 'bold' : 'normal');
      doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
      doc.text(String(item.label), summaryX + 4, lineY, { align: 'left' });
      doc.text(String(item.value), summaryX + summaryBoxWidth - 4, lineY, { align: 'right' });
    });
  }

  // Signature Block if space permits
  if (finalY < pageHeight - 40) {
    const signY = pageHeight - 24;
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 115);
    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.3);

    // Accountant signature
    doc.line(margin + 5, signY, margin + 45, signY);
    doc.text('Accountant In-Charge', margin + 25, signY + 4, { align: 'center' });

    // Financial Director
    doc.line(pageWidth - margin - 45, signY, pageWidth - margin - 5, signY);
    doc.text('Financial Approval & Seal', pageWidth - margin - 25, signY + 4, { align: 'center' });
  }

  return doc;
}

/**
 * Triggers browser download of generated PDF
 */
export function downloadPDF(options: PDFExportOptions, filename?: string): void {
  const doc = generateProfessionalPDF(options);
  const cleanFilename = filename || `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(cleanFilename);
}
