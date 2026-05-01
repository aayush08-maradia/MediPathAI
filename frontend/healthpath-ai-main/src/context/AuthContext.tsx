import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdToken,
  User as FirebaseUser,
} from "firebase/auth";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

export type MediUser = {
  id: string;            // MediPath AI ID, e.g. MP-2026-8F3KQ
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
};

type AuthContextValue = {
  user: MediUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<MediUser>;
  signup: (data: { name: string; email: string; phone?: string; password: string }) => Promise<MediUser>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MediUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          // Get user document from Firestore
          const userDocRef = doc(db, "users", fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUser(userDocSnap.data() as MediUser);
            setFirebaseUser(fbUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup: AuthContextValue["signup"] = async ({ name, email, phone, password }) => {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      console.log("✅ Firebase Auth user created:", fbUser.uid);

      // Create user document in Firestore (only include defined fields)
      const mediPathId = `MP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const newUser: MediUser = {
        id: mediPathId,
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone && phone.trim() ? phone.trim() : null, // Convert undefined/empty to null
        createdAt: new Date().toISOString(),
      };

      console.log("📝 Creating Firestore document for:", fbUser.uid);
      await setDoc(doc(db, "users", fbUser.uid), newUser);
      console.log("✅ Firestore document created successfully");
      
      setUser(newUser);
      return newUser;
    } catch (error: any) {
      console.error("❌ Signup error:", error);
      throw new Error(error.message || "Signup failed");
    }
  };

  const login: AuthContextValue["login"] = async (email, password) => {
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Get user document from Firestore
      const userDocRef = doc(db, "users", fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as MediUser;
        setUser(userData);
        return userData;
      } else {
        // If user exists in Auth but not in Firestore, create the profile
        console.log("Creating missing Firestore profile for:", fbUser.email);
        const mediPathId = `MP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const newUser: MediUser = {
          id: mediPathId,
          name: fbUser.displayName || email.split("@")[0],
          email: fbUser.email || email,
          phone: null, // Use null instead of undefined
          createdAt: new Date().toISOString(),
        };
        
        await setDoc(userDocRef, newUser);
        setUser(newUser);
        return newUser;
      }
    } catch (error: any) {
      throw new Error(error.message || "Login failed");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error: any) {
      throw new Error(error.message || "Logout failed");
    }
  };

  const getIdTokenForRequests = async () => {
    if (firebaseUser) {
      try {
        return await getIdToken(firebaseUser);
      } catch (error) {
        console.error("Error getting ID token:", error);
        return null;
      }
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        signup,
        logout,
        getIdToken: getIdTokenForRequests,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};