export const APP_CONFIG = {
  // File upload settings
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf']
  },
  
  // Medical analysis settings
  medical: {
    defaultWeight: 70, // kg
    ageThreshold: 65, // years for elderly adjustment
    elderlyDosageAdjustment: 0.8
  },
  
  // UI settings
  ui: {
    animationDuration: 200,
    debounceDelay: 300
  },
  
  // API endpoints (for future expansion)
  api: {
    baseUrl: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api'
  }
} as const;