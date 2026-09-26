import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { StorageService } from './storage';
import { User, StudentProfile } from '../types';

const AUTH_PROVIDER_DISABLED_MESSAGE =
  'El proveedor de autenticación por Correo/Contraseña está deshabilitado en Firebase Console. ' +
  'Habilítalo en Authentication > Sign-in method para poder crear usuarios reales.';

export interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch the Firestore /users/{uid} document for a Firebase user, creating it
 * (and the studentProfile, when applicable) on first sign-in. Shared by the
 * auth state listener and any interactive sign-in method (email, Google, etc).
 */
async function resolveOrCreateAppUser(fbUser: FirebaseUser): Promise<User> {
  const userRef = doc(db, 'users', fbUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      id: fbUser.uid,
      name: data.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
      email: data.email || fbUser.email || '',
      avatar: data.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      role: data.role || 'student',
      createdAt: data.createdAt || new Date().toISOString(),
    };
  }

  const role = fbUser.email?.includes('mentor') ? 'mentor' : 'student';
  const name = fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario';
  const avatar = role === 'mentor'
    ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  const appUser: User = {
    id: fbUser.uid,
    name,
    email: fbUser.email || '',
    avatar,
    role,
    createdAt: new Date().toISOString(),
  };

  // Save to Firestore
  await setDoc(userRef, {
    ...appUser,
    updatedAt: serverTimestamp(),
  });

  // If student, create studentProfile if doesn't exist
  if (role === 'student') {
    const profileRef = doc(db, 'studentProfiles', fbUser.uid);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      const studentProfile: StudentProfile = {
        id: fbUser.uid,
        userId: fbUser.uid,
        grade: 'Grado 11-A',
        overallXp: 0,
        overallLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        diagnosticCompleted: false,
        statusHealth: 'observacion',
        mentorNotes: 'Estudiante nuevo registrado en Aula Viva.',
      };

      await setDoc(profileRef, studentProfile);
    }
  }

  return appUser;
}

export const FirebaseAuthService = {
  /**
   * Listen to auth state changes and sync with Firestore /users/{uid}
   */
  subscribeToAuth(callback: (user: User | null, firebaseUser: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        callback(null, null);
        return;
      }

      try {
        const appUser = await resolveOrCreateAppUser(fbUser);
        callback(appUser, fbUser);
      } catch (err) {
        console.error('Error fetching user profile from Firestore:', err);
        // Fallback with minimal info
        callback(
          {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuario',
            email: fbUser.email || '',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            role: fbUser.email?.includes('mentor') ? 'mentor' : 'student',
            createdAt: new Date().toISOString(),
          },
          fbUser
        );
      }
    });
  },

  /**
   * Log in with Email and Password
   */
  async loginWithEmail(email: string, pass: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    const state = StorageService.getState();
    const existingUser = state.users.find((u) => u.email.toLowerCase() === trimmedEmail);

    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      return (
        existingUser || {
          id: cred.user.uid,
          name: cred.user.displayName || trimmedEmail.split('@')[0],
          email: trimmedEmail,
          role: trimmedEmail.includes('mentor') ? 'mentor' : 'student',
          avatar:
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
        }
      );
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        // Do not silently fall back to a local-only session: surface the real
        // misconfiguration so it is visible instead of masking it as a successful login.
        throw new Error(AUTH_PROVIDER_DISABLED_MESSAGE);
      }
      throw err;
    }
  },

  /**
   * Log in with Google (OAuth popup). Creates the Firestore user/profile
   * documents automatically on first sign-in.
   */
  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const cred = await signInWithPopup(auth, provider);
      return await resolveOrCreateAppUser(cred.user);
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        throw new Error(
          'El proveedor de autenticación de Google está deshabilitado en Firebase Console. ' +
          'Habilítalo en Authentication > Sign-in method para poder iniciar sesión con Google.'
        );
      }
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        throw new Error('Se cerró la ventana de inicio de sesión con Google antes de completarse.');
      }
      if (err?.code === 'auth/unauthorized-domain') {
        throw new Error(
          'Este dominio no está autorizado para OAuth con Google. En Firebase Console ve a ' +
          'Authentication > Settings > Authorized domains y agrega el dominio actual (por ejemplo, localhost).'
        );
      }
      throw err;
    }
  },

  /**
   * Register a new user with Email, Password and Role
   */
  async registerWithEmail(
    name: string,
    email: string,
    pass: string,
    role: 'mentor' | 'student',
    grade: string = 'Grado 11'
  ): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
      const uid = cred.user.uid;

      const userDoc: User = {
        id: uid,
        name: trimmedName,
        email: trimmedEmail,
        avatar:
          role === 'mentor'
            ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role,
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore users collection
      try {
        await setDoc(doc(db, 'users', uid), {
          ...userDoc,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore user save note:', e);
      }

      // If student, create studentProfile
      if (role === 'student') {
        const studentProfile: StudentProfile = {
          id: uid,
          userId: uid,
          grade,
          overallXp: 0,
          overallLevel: 1,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: new Date().toISOString().split('T')[0],
          diagnosticCompleted: false,
          statusHealth: 'observacion',
          mentorNotes: 'Estudiante nuevo registrado en Aula Viva.',
        };
        try {
          await setDoc(doc(db, 'studentProfiles', uid), studentProfile);
        } catch (e) {
          console.warn('Firestore profile save note:', e);
        }
      }

      return userDoc;
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        // Do not silently fall back to a local-only user: surface the real
        // misconfiguration instead of creating an account that never registers in Firebase Auth.
        throw new Error(AUTH_PROVIDER_DISABLED_MESSAGE);
      }
      throw err;
    }
  },

  /**
   * Sign out current user
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Get currently authenticated user in Firebase Auth
   */
  getCurrentFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  },
};
