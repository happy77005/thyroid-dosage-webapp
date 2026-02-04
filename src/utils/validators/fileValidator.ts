import { APP_CONFIG } from '../../config/app.config';

export class FileValidator {
  static async validatePDFFile(file: File): Promise<boolean> {
    // Check file type
    if (!APP_CONFIG.upload.allowedTypes.includes(file.type)) {
      throw new Error('Please upload a valid PDF file');
    }
    
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!APP_CONFIG.upload.allowedExtensions.includes(fileExtension)) {
      throw new Error('File must have a .pdf extension');
    }
    
    // Check file size
    if (file.size > APP_CONFIG.upload.maxFileSize) {
      const maxSizeMB = APP_CONFIG.upload.maxFileSize / (1024 * 1024);
      throw new Error(`File size must be less than ${maxSizeMB}MB`);
    }
    
    // Check if file is empty
    if (file.size === 0) {
      throw new Error('File appears to be empty');
    }
    
    return true;
  }

  static validateFileContent(content: string): boolean {
    if (!content || content.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no readable text');
    }
    
    if (content.length < 50) {
      throw new Error('PDF contains insufficient text for analysis');
    }
    
    return true;
  }
}