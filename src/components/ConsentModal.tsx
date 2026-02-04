import React from 'react';
import { X, Shield, Database, Lock } from 'lucide-react';
import { ConsentModalProps } from '../types/medical';

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
  userName,
  recommendedDose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Data Collection Consent
            </h2>
          </div>
          <button
            onClick={onDecline}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Introduction */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-2">
                  Data Collection for Algorithm Improvement
                </h3>
                <p className="text-blue-800 text-sm">
                  We would like to collect your dosage calculation data to improve our algorithm and provide safer, more accurate recommendations for all users.
                </p>
              </div>
            </div>
          </div>

          {/* Data to be collected */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Data We Will Collect:</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">User Name:</span>
                <span className="font-medium text-gray-900">{userName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Report Date:</span>
                <span className="font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Recommended Dose:</span>
                <span className="font-medium text-gray-900">{recommendedDose} µg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Lab Values:</span>
                <span className="font-medium text-gray-900">TSH, T3, T4 (if provided)</span>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Purpose of Data Collection:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Improve algorithm accuracy and safety</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Track trends in thyroid function and dosing</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Provide more personalized recommendations</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Ensure compliance with medical guidelines</span>
              </li>
            </ul>
          </div>

          {/* Privacy and Security */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-900 mb-2">
                  Privacy & Security
                </h3>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Your data is stored securely and encrypted</li>
                  <li>• No personal identifiers beyond your name are collected</li>
                  <li>• Data is used solely for algorithm improvement</li>
                  <li>• You can request data deletion at any time</li>
                  <li>• We comply with applicable privacy regulations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="text-sm text-gray-600">
            <p>
              By clicking "I Accept", you consent to the collection and use of your dosage calculation data 
              for the purposes described above. You can decline and still use the dosage calculator, 
              but your data will not be stored for algorithm improvement.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onDecline}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            I Accept the Terms
          </button>
        </div>
      </div>
    </div>
  );
};
