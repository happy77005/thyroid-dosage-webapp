// Patient information extraction patterns
export const PATIENT_PATTERNS = {
  // Pattern: "Mr/Mrs/Ms NAME (44Y/F)"
  nameAgeGender: /(?:Mr|Mrs|Ms)\.?\s+([A-Z][a-zA-Z\s]+)\s+\((\d{1,3})Y\/([MF])\)/i,
  
  // Alternative name pattern
  nameOnly: /(?:Patient|Name)[\s:]+([A-Z][a-zA-Z\s]+)/i,
  
  // Date patterns
  datePattern: /\b(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
  dateNumeric: /\b(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})\b/, // 2025-10-14 or 2025/10/14
  dateDmySlashes: /\b(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})\b/, // 14/10/2025
  
  // Age extraction
  agePattern: /(?:Age|age)[\s:]*(\d{1,3})\s*(?:years?|yrs?|Y)?/i,
  
  // Gender extraction
  genderPattern: /(?:Gender|Sex)[\s:]*([MF]|Male|Female)/i
} as const;

// Thyroid test extraction patterns
export const THYROID_TEST_PATTERNS = {
  TSH: {
    pattern: /(TSH[^\n]*?)\s+(μIU\/mL|mIU\/L)\s+([0-9.]+)\s*[-–]\s*([0-9.]+)\s+([0-9.]+)/i,
    alternativePatterns: [
      /Thyroid[\s\-]Stimulating[\s\-]Hormone[\s:]*([0-9.]+)/i,
      /TSH[\s\-]Ultra[\s:]*([0-9.]+)/i
    ]
  },
  
  T3: {
    pattern: /(T3[\s\-A-Z]*)[\s:]*([0-9.]+)[\s]*(ng\/dl|nmol\/L)?(?:.*?([0-9.]+)[\s]*[-–][\s]*([0-9.]+))?/i,
    alternativePatterns: [
      /Triiodothyronine[\s:]*([0-9.]+)/i,
      /Total[\s\-]T3[\s:]*([0-9.]+)/i
    ]
  },
  
  T4: {
    pattern: /(T4[\s\-A-Z]*)[\s:]*([0-9.]+)[\s]*(μ?g\/dl|nmol\/L)?(?:.*?([0-9.]+)[\s]*[-–][\s]*([0-9.]+))?/i,
    alternativePatterns: [
      /Thyroxine[\s:]*([0-9.]+)/i,
      /Total[\s\-]T4[\s:]*([0-9.]+)/i
    ]
  },
  
  FT3: {
    pattern: /(FT3|Free[\s\-]T3)[\s\-A-Z]*[\s:]*([0-9.]+)[\s]*(pg\/ml|pmol\/L)?(?:.*?([0-9.]+)[\s]*[-–][\s]*([0-9.]+))?/i,
    alternativePatterns: [
      /Free[\s\-]Triiodothyronine[\s:]*([0-9.]+)/i
    ]
  },
  
  FT4: {
    pattern: /(FT4|Free[\s\-]T4)[\s\-A-Z]*[\s:]*([0-9.]+)[\s]*(ng\/dl|pmol\/L)?(?:.*?([0-9.]+)[\s]*[-–][\s]*([0-9.]+))?/i,
    alternativePatterns: [
      /Free[\s\-]Thyroxine[\s:]*([0-9.]+)/i
    ]
  }
} as const;

// Additional medical patterns for future expansion
export const ADDITIONAL_PATTERNS = {
  // Antibody tests
  antiTPO: /Anti[\s\-]TPO[\s:]*([0-9.]+)/i,
  antiTG: /Anti[\s\-]TG[\s:]*([0-9.]+)/i,
  
  // Other hormones
  cortisol: /Cortisol[\s:]*([0-9.]+)/i,
  insulin: /Insulin[\s:]*([0-9.]+)/i,
  
  // Lab information
  labName: /(?:Laboratory|Lab)[\s:]*([A-Z][a-zA-Z\s&]+)/i,
  reportId: /(?:Report|ID|Reference)[\s#:]*([A-Z0-9\-]+)/i
} as const;