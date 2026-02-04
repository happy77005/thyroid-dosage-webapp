import * as pdfjsLib from 'pdfjs-dist';
import { FileValidator } from './validators/fileValidator';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PDFParser {
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Validate file first
      await FileValidator.validatePDFFile(file);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }
      
      // Validate extracted content
      FileValidator.validateFileContent(fullText);
      
      return fullText;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse PDF file');
    }
  }

  static async validatePDFFile(file: File): Promise<boolean> {
    return FileValidator.validatePDFFile(file);
  }

  // Try to read a meaningful date from PDF metadata and content
  static async extractReportDateFromPDF(file: File): Promise<string | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // First try to extract date from PDF content
      const contentDate = await PDFParser.extractDateFromContent(pdf);
      if (contentDate) {
        console.log('Found date in PDF content:', contentDate);
        return contentDate;
      }
      
      // Fallback to metadata
      try {
        // @ts-ignore - pdfjs types may not include getMetadata in some builds
        const meta = await pdf.getMetadata?.();
        const info = meta?.info || {};
        const raw = info.CreationDate || info.ModDate || null;
        if (!raw) return null;

        // Common PDF date format: D:YYYYMMDDHHmmSS... or plain ISO
        const parsed = PDFParser.parsePdfDate(raw);
        if (parsed) {
          console.log('Found date in PDF metadata:', parsed);
        }
        return parsed;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  // Extract date from PDF content by searching for common date patterns
  private static async extractDateFromContent(pdf: any): Promise<string | null> {
    try {
      let fullText = '';
      
      // Extract text from first few pages (usually contains report info)
      const maxPages = Math.min(3, pdf.numPages);
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }
      
      // Look for common date patterns in medical reports
      const datePatterns = [
        // MM/DD/YYYY or MM-DD-YYYY
        /(?:Report\s+Date|Date\s+of\s+Report|Date|Report\s+Date)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        // DD/MM/YYYY or DD-MM-YYYY
        /(?:Report\s+Date|Date\s+of\s+Report|Date|Report\s+Date)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        // YYYY-MM-DD
        /(?:Report\s+Date|Date\s+of\s+Report|Date|Report\s+Date)[\s:]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
        // Month DD, YYYY
        /(?:Report\s+Date|Date\s+of\s+Report|Date|Report\s+Date)[\s:]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
        // DD Month YYYY
        /(?:Report\s+Date|Date\s+of\s+Report|Date|Report\s+Date)[\s:]*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
        // Just look for any date pattern near "Date" or "Report"
        /(?:Date|Report)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        /(?:Date|Report)[\s:]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
        /(?:Date|Report)[\s:]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
        /(?:Date|Report)[\s:]*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i
      ];
      
      for (const pattern of datePatterns) {
        const match = fullText.match(pattern);
        if (match && match[1]) {
          const dateStr = match[1].trim();
          const parsedDate = PDFParser.parseDateString(dateStr);
          if (parsedDate) {
            return parsedDate;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error extracting date from PDF content:', error);
      return null;
    }
  }

  // Parse various date string formats
  private static parseDateString(dateStr: string): string | null {
    if (!dateStr) return null;
    
    try {
      // Try different date parsing approaches
      let date: Date | null = null;
      
      // Handle MM/DD/YYYY or MM-DD-YYYY
      if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(dateStr)) {
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const [month, day, year] = parts;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
      // Handle YYYY-MM-DD
      else if (/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(dateStr)) {
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          const [year, month, day] = parts;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
      // Handle text dates like "January 15, 2024" or "15 January 2024"
      else {
        date = new Date(dateStr);
      }
      
      if (date && !isNaN(date.getTime())) {
        // Validate that the date is reasonable (not too far in past/future)
        const now = new Date();
        const yearDiff = Math.abs(date.getFullYear() - now.getFullYear());
        if (yearDiff <= 10) { // Within 10 years
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error parsing date string:', dateStr, error);
      return null;
    }
  }

  private static parsePdfDate(raw: string): string | null {
    if (!raw) return null;
    // Remove leading 'D:' if present
    const s = raw.startsWith('D:') ? raw.slice(2) : raw;
    // YYYYMMDDHHmmSS or subset
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    if (y && m && d) {
      const iso = `${y}-${m}-${d}`;
      const date = new Date(iso);
      if (!isNaN(date.getTime())) return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    }
    // Fallback: try Date constructor directly
    const date = new Date(raw);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    }
    return null;
  }
}