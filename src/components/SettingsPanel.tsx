import React, { useState } from 'react';
import { Settings, X, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createPortal } from 'react-dom';

const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user, logout, deleteAccount } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      await deleteAccount(password || undefined);
    } catch (error) {
      console.error('Delete account error:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative z-[60]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 p-2"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed right-4 top-16 w-64 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200 z-[110] overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Settings</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Sign Out</p>
                      <p className="text-xs text-gray-500">
                        {user?.email || 'Log out of your account'}
                      </p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors mt-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">Delete Account</p>
                      <p className="text-xs text-red-500">
                        Permanently delete your account and all data
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" 
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Account
                  </h3>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-3">
                  Are you sure you want to delete your account? This will permanently remove:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• All your medical reports and analysis data</li>
                  <li>• Your patient profiles and calculation history</li>
                  <li>• Your account and login credentials</li>
                  <li>• All stored thyroid test results</li>
                  
                </ul>
                <h1>please select the account in the pop up to delete</h1>
                
                {user?.providerData?.[0]?.providerId === 'password' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Enter your password to confirm"
                    />
                  </div>
                )}
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default SettingsPanel;
