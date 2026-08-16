import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// Request precise Google Workspace scopes to connect Sheets, Gmail, and Google Drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

try {
  cachedAccessToken = sessionStorage.getItem('geca_tpo_oauth_token');
} catch (e) {
  cachedAccessToken = null;
}

export const clearCachedToken = () => {
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('geca_tpo_oauth_token');
  } catch (e) {
    // ignore
  }
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = sessionStorage.getItem('geca_tpo_oauth_token');
        } catch (e) {
          cachedAccessToken = null;
        }
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearCachedToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token from sign-in.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('geca_tpo_oauth_token', cachedAccessToken);
    } catch (e) {
      // ignore
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' || 
      error?.message?.includes('popup-closed-by-user') ||
      error?.code === 'auth/cancelled-popup-request' || 
      error?.message?.includes('cancelled-popup-request') ||
      error?.code === 'auth/popup-blocked' ||
      error?.message?.includes('popup-blocked')
    ) {
      console.info('Google Sign-In popup was closed or cancelled by the user.');
      return null;
    }
    console.error('Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = sessionStorage.getItem('geca_tpo_oauth_token');
    } catch (e) {
      cachedAccessToken = null;
    }
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  clearCachedToken();
};
