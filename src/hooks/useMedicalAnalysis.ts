import { useState, useCallback } from 'react';
import { MedicalReport, DosageRecommendation } from '../types/medical';
import { PDFParser } from '../utils/pdfParser';
import { MedicalDataExtractor } from '../utils/medicalDataExtractor';
import { ThyroidDosagePredictor } from '../utils/thyroidDosagePredictor';
import { FirestoreService, StoredMedicalReport } from '../services/FirestoreService';
import { useAuth } from './useAuth';
import { DailyLimitManager } from '../utils/dailyLimit';

interface AnalysisState {
  isProcessing: boolean;
  error: string | null;
  report: MedicalReport | null;
  recommendation: DosageRecommendation | null;
  condition: string;
  savedReports: StoredMedicalReport[];
  loadingReports: boolean;
}

export const useMedicalAnalysis = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AnalysisState>({
    isProcessing: false,
    error: null,
    report: null,
    recommendation: null,
    condition: '',
    savedReports: [],
    loadingReports: false
  });

  const analyzeFile = useCallback(async (file: File) => {
    if (!user) {
      setState(prev => ({
        ...prev,
        error: 'You must be logged in to analyze files'
      }));
      return;
    }

    // Apply the same entry limit for PDF uploads
    const entryStatus = DailyLimitManager.canMakeEntry(user.uid, user.metadata?.creationTime ?? null);
    if (!entryStatus.allowed) {
      setState(prev => ({
        ...prev,
        error: `Monthly limit reached. Remaining entries this month: ${entryStatus.remainingEntries}`
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      report: null,
      recommendation: null,
      condition: ''
    }));

    try {
      // Validate PDF file
      await PDFParser.validatePDFFile(file);
      
      // Extract text from PDF
      const extractedText = await PDFParser.extractTextFromPDF(file);
      
      // Parse medical data
      const report = MedicalDataExtractor.extractMedicalReportData(extractedText);

      // If report date missing, try PDF metadata, else current date
      if (!report.patientInfo.date) {
        const metaDate = await PDFParser.extractReportDateFromPDF(file);
        report.patientInfo.date = metaDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      }
      
      // Generate dosage recommendation
      const recommendation = ThyroidDosagePredictor.predictDosage(
        report.tests, 
        report.patientInfo.age
      );
      
      // Determine condition
      const condition = ThyroidDosagePredictor.getThyroidCondition(report.tests);

      setState({
        isProcessing: false,
        error: null,
        report,
        recommendation,
        condition,
        savedReports: state.savedReports,
        loadingReports: false
      });
      // Record successful entry after processing
      try { DailyLimitManager.recordEntry(user.uid); } catch {}
      
    } catch (err) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: err instanceof Error ? err.message : 'An error occurred while processing the file'
      }));
    }
  }, [user, state.savedReports]);

  const loadSavedReports = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, loadingReports: true }));
    
    try {
      const reports = await FirestoreService.getMedicalReports(user.uid);
      setState(prev => ({
        ...prev,
        savedReports: reports,
        loadingReports: false
      }));
    } catch (error) {
      console.error('Error loading saved reports:', error);
      setState(prev => ({
        ...prev,
        loadingReports: false,
        error: 'Failed to load saved reports'
      }));
    }
  }, [user]);

  const loadReport = useCallback(async (reportId: string) => {
    try {
      const storedReport = await FirestoreService.getMedicalReport(reportId);
      if (storedReport) {
        // Convert stored test results back to the original format
        const tests: any = {};
        if (storedReport.testResults) {
          if (storedReport.testResults.TSH) {
            tests.TSH = {
              value: storedReport.testResults.TSH.value,
              units: storedReport.testResults.TSH.units,
              status: storedReport.testResults.TSH.status
            };
          }
          if (storedReport.testResults.T3) {
            tests.T3 = {
              value: storedReport.testResults.T3.value,
              units: storedReport.testResults.T3.units,
              status: storedReport.testResults.T3.status
            };
          }
          if (storedReport.testResults.T4) {
            tests.T4 = {
              value: storedReport.testResults.T4.value,
              units: storedReport.testResults.T4.units,
              status: storedReport.testResults.T4.status
            };
          }
          if (storedReport.testResults.FT3) {
            tests.FT3 = {
              value: storedReport.testResults.FT3.value,
              units: storedReport.testResults.FT3.units,
              status: storedReport.testResults.FT3.status
            };
          }
          if (storedReport.testResults.FT4) {
            tests.FT4 = {
              value: storedReport.testResults.FT4.value,
              units: storedReport.testResults.FT4.units,
              status: storedReport.testResults.FT4.status
            };
          }
        }

        const report: MedicalReport = {
          patientInfo: storedReport.patientInfo,
          tests,
          rawText: '' // We don't store raw text anymore
        };

        setState(prev => ({
          ...prev,
          report,
          recommendation: storedReport.dosageRecommendation || null,
          condition: storedReport.condition || ''
        }));
      }
    } catch (error) {
      console.error('Error loading report:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load report'
      }));
    }
  }, []);

  const deleteReport = useCallback(async (reportId: string) => {
    try {
      await FirestoreService.deleteMedicalReport(reportId);
      setState(prev => ({
        ...prev,
        savedReports: prev.savedReports.filter(report => report.id !== reportId)
      }));
    } catch (error) {
      console.error('Error deleting report:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to delete report'
      }));
    }
  }, []);

  const saveReport = useCallback(async (report: MedicalReport, recommendation: DosageRecommendation | null, condition: string) => {
    console.log('saveReport called with:', { report, recommendation, condition, user: user?.uid });
    
    if (!user) {
      const errorMsg = 'You must be logged in to save reports';
      console.error(errorMsg);
      setState(prev => ({
        ...prev,
        error: errorMsg
      }));
      throw new Error(errorMsg);
    }

    try {
      console.log('Calling FirestoreService.saveMedicalReport...');
      console.log('User details:', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      });
      // Persist a lightweight copy in localStorage for offline viewing
      try {
        const local = JSON.parse(localStorage.getItem('saved_reports_local') || '[]');
        local.unshift({
          id: `local_${Date.now()}`,
          patientInfo: report.patientInfo,
          testResults: report.tests,
          recommendation,
          condition,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('saved_reports_local', JSON.stringify(local.slice(0, 50)));
      } catch {}

      const reportId = await FirestoreService.saveMedicalReport(
        user.uid,
        report,
        recommendation,
        ''
      );
      console.log('FirestoreService.saveMedicalReport completed successfully, reportId:', reportId);
      
      // Try to reload saved reports, but don't let it affect the save operation
      try {
        console.log('Attempting to reload saved reports...');
        await loadSavedReports();
        console.log('Successfully reloaded saved reports');
        
        // Also log the current state after reload
        setState(prev => {
          console.log('State after reload:', prev);
          return prev;
        });
      } catch (loadError) {
        console.warn('Failed to reload saved reports after save:', loadError);
        // Don't throw this error - the save was successful
      }
      
      return reportId;
    } catch (error) {
      console.error('Error in saveReport function:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to save report'
      }));
      throw error;
    }
  }, [user, loadSavedReports]);

  const resetAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      report: null,
      recommendation: null,
      condition: '',
      error: null
    }));
  }, []);

  return {
    ...state,
    analyzeFile,
    loadSavedReports,
    loadReport,
    deleteReport,
    saveReport,
    resetAnalysis
  };
};