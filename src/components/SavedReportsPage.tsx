import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { SavedReports } from './SavedReports';
import { useNavigate } from 'react-router-dom';

const SavedReportsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 text-blue-600 mr-2" />
              Saved Reports
            </h1>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SavedReports onBack={() => navigate(-1)} />
      </main>
    </div>
  );
};

export default SavedReportsPage;


