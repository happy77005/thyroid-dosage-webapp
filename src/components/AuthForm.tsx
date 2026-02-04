import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Activity, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { ConsentModal } from './ConsentModal';

const AuthForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = (location.state && (location.state as any).mode) || 'signin';
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConsent, setShowConsent] = useState(false);

  const { signIn, signUp, signInWithGoogle, error, user } = useAuth();

  const getConsentKey = (uid: string) => `data_consent_v1:${uid}`;
  const hasConsent = (uid?: string | null) => !!(uid && localStorage.getItem(getConsentKey(uid)) === 'true');
  const recordConsent = (uid?: string | null) => { if (uid) localStorage.setItem(getConsentKey(uid), 'true'); };

  // Redirect to app if user is authenticated
  useEffect(() => {
    if (user && user.emailVerified) {
      if (!hasConsent(user.uid)) {
        setShowConsent(true);
        return; // hold navigation until consent handled
      }
      const timer = setTimeout(() => {
        navigate('/app');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Password validation
  const validatePassword = (password: string) => {
    const minLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers
    };
  };

  const passwordValidation = validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setConfirmError('');
    setSuccessMessage('');

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setConfirmError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (!passwordValidation.isValid) {
          setConfirmError('Password must be at least 6 characters with uppercase, lowercase, and numbers');
          setLoading(false);
          return;
        }

        await signUp(email, password);
        // After sign up, if a user object appears, show consent; otherwise just show verification
        if (user && !hasConsent(user.uid)) {
          setShowConsent(true);
        }
        setVerificationSent(true);
        setSuccessMessage('Account created successfully! Please check your email for verification.');
        setLoading(false);
        return;
      } else {
        await signIn(email, password);
        setSuccessMessage('Sign in successful! Redirecting...');
        // Fallback navigation after 2 seconds if useEffect doesn't trigger
        setTimeout(() => {
          if (user && user.emailVerified) {
            navigate('/app');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      if (!isSignUp) setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setSuccessMessage('');
    try {
      await signInWithGoogle();
      setSuccessMessage('Google sign in successful! Redirecting...');
      if (user && !hasConsent(user.uid)) {
        setShowConsent(true);
      }
      // Fallback navigation after 2 seconds if useEffect doesn't trigger
      setTimeout(() => {
        if (user && user.emailVerified) {
          navigate('/app');
        }
      }, 2000);
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setConfirmError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-2xl shadow-xl p-4 sm:p-8 w-full max-w-md border border-white/20 dark:border-gray-700/20">
        <ConsentModal
          isOpen={showConsent}
          onAccept={() => {
            recordConsent(user?.uid ?? null);
            setShowConsent(false);
            if (user && user.emailVerified) navigate('/app');
          }}
          onDecline={async () => {
            // Decline consent: sign out the user and redirect to landing page
            setShowConsent(false);
            try {
              const { signOut } = await import('firebase/auth');
              const { auth } = await import('../firebase/config');
              await signOut(auth);
            } catch (err) {
              console.error('Error signing out after consent decline:', err);
            }
            navigate('/');
          }}
          userName={user?.email || 'User'}
          recommendedDose={0}
        />
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {isSignUp ? 'Sign up to start managing your thyroid health' : 'Sign in to your ThyroidAI account'}
          </p>
        </div>

        {!verificationSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password validation for sign up */}
              {isSignUp && password && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password requirements:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center space-x-2 text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-red-500'}`}>
                      <CheckCircle className="w-3 h-3" />
                      <span>At least 6 characters</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-red-500'}`}>
                      <CheckCircle className="w-3 h-3" />
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-red-500'}`}>
                      <CheckCircle className="w-3 h-3" />
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 text-xs ${passwordValidation.hasNumbers ? 'text-green-600' : 'text-red-500'}`}>
                      <CheckCircle className="w-3 h-3" />
                      <span>One number</span>
                    </div>
                  </div>
                </div>
              )}

              {isSignUp && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-white/50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                    required
                  />
                </div>
              )}
            </div>

            {/* Error Messages */}
            {(error || confirmError) && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error || confirmError}</span>
              </div>
            )}

            {/* Success Messages */}
            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && !passwordValidation.isValid)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </form>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-6 rounded-lg text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Verify Your Email</h2>
            <p className="mb-2">A verification link has been sent to <span className="font-semibold">{email}</span>.</p>
            <p className="mb-4">Please check your inbox and click the link to activate your account. You can sign in after verifying your email.</p>
            <button
              className="mt-2 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              onClick={() => setVerificationSent(false)}
            >
              Back to Sign In
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={handleToggleMode}
            className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
            }
          </button>
        </div>

        {/* Back to Landing Page */}
        <div className="mt-4 text-center">
          <button
            onClick={handleBackToHome}
            className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200 transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
