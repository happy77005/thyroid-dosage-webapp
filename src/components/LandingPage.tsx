import React from 'react';
import { Activity, Brain, FileText, Pill, Shield, Cloud, Users, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: <FileText className="w-8 h-8 text-blue-500" />,
    title: 'PDF Report Analysis',
    desc: 'Upload your thyroid function test reports and get instant AI-powered analysis with detailed insights.'
  },
  {
    icon: <Brain className="w-8 h-8 text-purple-500" />,
    title: 'AI powered Dosage support',
    desc: 'Get personalized thyroid medication recommendations based on your test results and medical profile.'
  },
  {
    icon: <Cloud className="w-8 h-8 text-green-500" />,
    title: 'Cloud Data Storage',
    desc: 'Securely store your medical reports and track your thyroid health over time with cloud backup.'
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-yellow-500" />,
    title: 'Health Tracking',
    desc: 'Monitor your thyroid levels and medication adjustments with comprehensive health analytics.'
  }
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header */}
      <header className="w-full py-6 px-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">ThyroidAI</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:from-blue-600 hover:to-purple-700 transition-all text-sm"
            onClick={() => navigate('/auth', { state: { mode: 'signin' } })}
          >
            Sign In
          </button>
          <button
            className="bg-white dark:bg-gray-800 border border-blue-500 dark:border-purple-600 text-blue-700 dark:text-purple-300 px-5 py-2 rounded-lg font-semibold shadow hover:bg-blue-50 dark:hover:bg-purple-900/20 transition-all text-sm"
            onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-gray-900 dark:text-white leading-tight">
          Smart Thyroid <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">Health Management</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl">
          Transform your thyroid care with AI-powered analysis, personalized dosage recommendations, and comprehensive health tracking. 
          Upload your lab reports and get instant insights from our advanced medical AI.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <button
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all text-lg"
            onClick={() => navigate('/auth', { state: { mode: 'signup' } })}
          >
            Get Started Free
          </button>
          <button
            className="bg-white dark:bg-gray-800 border border-blue-500 dark:border-purple-600 text-blue-700 dark:text-purple-300 px-8 py-4 rounded-lg font-semibold shadow-lg hover:bg-blue-50 dark:hover:bg-purple-900/20 transition-all text-lg"
            onClick={() => navigate('/auth', { state: { mode: 'signin' } })}
          >
            Sign In
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 w-full max-w-4xl">
          {features.map((feature, i) => (
            <div key={i} className="flex flex-col items-center bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              {feature.icon}
              <h3 className="mt-3 text-lg font-semibold text-gray-800 dark:text-gray-200">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 text-center">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Security & Privacy */}
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl shadow-lg p-6 max-w-2xl">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Shield className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Secure & Private</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Your medical data is encrypted and stored securely. We follow HIPAA-compliant practices and never share your information without consent.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
        <div className="max-w-4xl mx-auto px-4">
          <p className="mb-2">
            <strong>Disclaimer:</strong> This tool is for educational and research purposes only. 
            Always consult with qualified healthcare professionals for medical decisions.
          </p>
          <p>&copy; {new Date().getFullYear()} ThyroidAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
