import React from 'react';
import { CheckCircle, Database, Shield } from 'lucide-react';

interface DataCollectionNoticeProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const DataCollectionNotice: React.FC<DataCollectionNoticeProps> = ({
  isVisible,
  onDismiss
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Shield className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-medium text-green-900">
              Data Collection Complete
            </h3>
          </div>
          <p className="text-sm text-green-800 mb-2">
            Your data has been collected securely to improve personalized dosage recommendations.
          </p>
          <div className="flex items-center space-x-2 text-xs text-green-700">
            <Database className="h-3 w-3" />
            <span>Algorithm improvement in progress</span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
