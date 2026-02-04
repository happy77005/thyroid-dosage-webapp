import { useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        setError('Please verify your email before signing in. Check your inbox for a verification link.');
        await signOut(auth);
        throw new Error('Email not verified');
      }
      // The user state will be updated by onAuthStateChanged
      return userCredential.user;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // The user state will be updated by onAuthStateChanged
      return result.user;
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const deleteAccount = async (password?: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      setError(null);
      
      // Ensure recent login before destructive operations
      try {
        if (password && user.email) {
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);
        } else if (user.providerData.some((p) => p.providerId === 'google.com')) {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(user, provider);
        }
      } catch (reauthError: any) {
        // If reauth fails, bubble up with a friendly message
        const message = reauthError?.code === 'auth/wrong-password'
          ? 'Incorrect password. Please try again.'
          : 'Re-authentication required. Please sign in again and retry.';
        setError(message);
        throw new Error(message);
      }
      
      // Delete all user data from Firestore first
      const batch = writeBatch(db);
      
      // Delete user profile
      const userDocRef = doc(db, 'users', user.uid);
      batch.delete(userDocRef);
      
      // Delete all medical reports for this user
      const reportsQuery = query(collection(db, 'medicalReports'), where('userId', '==', user.uid));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      reportsSnapshot.docs.forEach((reportDoc) => {
        batch.delete(reportDoc.ref);
      });
      
      // Delete all patient profiles for this user
      const profilesQuery = query(collection(db, 'patientProfiles'), where('userId', '==', user.uid));
      const profilesSnapshot = await getDocs(profilesQuery);
      
      profilesSnapshot.docs.forEach((profileDoc) => {
        batch.delete(profileDoc.ref);
      });
      
      // Commit all deletions
      await batch.commit();
      
      // Delete the user account (should succeed after reauth)
      await deleteUser(user);
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      // Handle requires-recent-login specifically
      if (error?.code === 'auth/requires-recent-login') {
        const msg = 'For security, please re-authenticate and try again.';
        setError(msg);
        throw new Error(msg);
      }
      setError(error.message);
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    deleteAccount
  };
};
