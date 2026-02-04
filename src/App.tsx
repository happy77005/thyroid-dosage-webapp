import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Code-split components for better performance
const LandingPage = lazy(() => import('./components/LandingPage'));
const AuthForm = lazy(() => import('./components/AuthForm'));
const ThyroidApp = lazy(() => import('./components/ThyroidApp'));
const SavedReportsPage = lazy(() => import('./components/SavedReportsPage'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));

function App() {
  const { user, loading, error } = useAuth();

  // Loading component for Suspense fallback
  const LoadingFallback = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 flex items-center space-x-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading...</span>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthForm />} />
        <Route path="/app" element={user ? <ThyroidApp /> : <Navigate to="/auth" replace />} />
        <Route path="/saved" element={user ? <SavedReportsPage /> : <Navigate to="/auth" replace />} />
        <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
