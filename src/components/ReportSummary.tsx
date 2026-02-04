import React from 'react';
import { FileText, Download } from 'lucide-react';
import { MedicalReport, DosageRecommendation } from '../types/medical';
import { ReportFormatter } from '../utils/formatters/reportFormatter';

interface ReportSummaryProps {
  report: MedicalReport;
  recommendation: DosageRecommendation | null;
  condition: string;
}

export const ReportSummary: React.FC<ReportSummaryProps> = ({ 
  report, 
  recommendation, 
  condition 
}) => {
  const generateSummaryText = () => {
    return ReportFormatter.generateSummaryText(report, recommendation, condition);
  };

  const downloadSummary = () => {
    const summaryText = generateSummaryText();
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `thyroid-analysis-${ReportFormatter.formatDateForFilename(report.patientInfo.date)}.txt`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Analysis Summary
        </h2>
        
        <button
          onClick={downloadSummary}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download Summary</span>
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
          {generateSummaryText()}
        </pre>
      </div>
    </div>
  );
};