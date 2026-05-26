import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(u);

      try {
        // 1. Try to load profile by UID (the correct long-term store)
        const uidRef  = doc(db, "users", u.uid);
        const uidSnap = await getDoc(uidRef);

        if (uidSnap.exists()) {
          setProfile(uidSnap.data());
        } else {
          // 2. Look up by email (seed data is keyed by email)
          const email = u.email?.toLowerCase();
          let profileData = null;

          if (email) {
            // Try email as doc ID first (seed format)
            const emailSnap = await getDoc(doc(db, "users", email));
            if (emailSnap.exists()) {
              profileData = emailSnap.data();
            } else {
              // Query by email field as fallback
              const q    = query(collection(db, "users"), where("email", "==", email));
              const snap = await getDocs(q);
              if (!snap.empty) profileData = snap.docs[0].data();
            }
          }

          // 3. Write/merge the profile under the UID so future lookups are instant
          const merged = {
            name:     profileData?.name     || u.displayName || u.email,
            email:    u.email?.toLowerCase(),
            role:     profileData?.role     || "user",
            office:   profileData?.office   || "UK",
            currency: profileData?.currency || "GBP",
            active:   profileData?.active   !== false,
            uid:      u.uid,
          };
          await setDoc(uidRef, merged, { merge: true });
          setProfile(merged);
        }
      } catch (error) {
        console.error("Profile load error:", error);
        // Provide minimal profile so the app still works
        setProfile({ name: u.email, role: "user", email: u.email });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
